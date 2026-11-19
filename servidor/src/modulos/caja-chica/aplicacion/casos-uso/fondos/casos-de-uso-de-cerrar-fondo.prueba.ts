import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { FONDO_ID, HOY } from '../comprobantes/dobles-de-comprobantes.soporte.js';
import {
  armarEscenarioDeReposiciones,
  sembrarComprobante,
  type EscenarioDeReposiciones,
} from '../reposiciones/dobles-de-reposiciones.soporte.js';
import { CerrarFondo, type DependenciasDeCierre, type PeticionDeCierre } from './cerrar-fondo.js';

const operador = operadorDePrueba();
let m: EscenarioDeReposiciones;
let valesCentavos = 0;

function dependenciasDeCierre(): DependenciasDeCierre {
  const { dependenciasDeReposiciones: r } = m;
  return {
    fondos: {
      unidadDeTrabajo: r.unidadDeTrabajo,
      fondos: m.fondos,
      consultas: {
        ...r.consultasDeFondos,
        datosDeLectura: async (ids) => {
          const lecturas = await r.consultasDeFondos.datosDeLectura(ids);
          return new Map([...lecturas].map(([id, lectura]) => [id, { ...lectura, valesCentavos }]));
        },
      },
      custodios: { nombreDelUsuario: async () => null },
      referencias: { exigirLocalidad: async () => {}, exigirCuentaBancaria: async () => {} },
      bancos: m.bancos,
      movimientos: { fechaDe: async () => null },
      auditoria: m.auditoria,
      publicadorEventos: m.publicador,
      reloj: r.reloj,
      configuracionDeArqueos: { diasParaAvisar: async () => 30, diasParaAvisarDeVales: async () => 5 },
    },
    compensada: {
      reposiciones: r.reposiciones,
      consultas: r.consultas,
      comprobantes: r.comprobantes,
      libro: r.libro,
      correlativos: r.correlativos,
    },
  };
}

const cerrar = (cambios: Partial<PeticionDeCierre> = {}) =>
  new CerrarFondo(dependenciasDeCierre()).ejecutar(operador, {
    fondoId: FONDO_ID,
    motivo: 'Ya no se necesita',
    cuentaBancariaId: 'cuenta-1',
    ...cambios,
  });

beforeEach(async () => {
  valesCentavos = 0;
  m = await armarEscenarioDeReposiciones();
});

describe('CerrarFondo: con lo pendiente y con efectivo', () => {
  it('liquida lo pendiente en una reposición compensada, deposita el resto y deja el fondo cerrado', async () => {
    const gasto = await sembrarComprobante(m, { montoCentavos: 30_000, documentoDeCompraId: 'documento-1' });
    await sembrarComprobante(m, { montoCentavos: 20_000, conActivoFijo: true });

    const fondo = await cerrar({ referencia: 'BOL-1' });

    expect(fondo).toMatchObject({ estado: 'cerrado', fechaDeCierre: HOY, motivoDeCierre: 'Ya no se necesita' });
    const [reposicion] = [...m.reposiciones.filas.values()];
    expect(reposicion).toMatchObject({
      numero: 1,
      forma: 'compensada_al_cerrar',
      movimientoId: null,
      montoCentavos: 50_000,
      custodio: 'Juan Pérez',
      estado: 'vigente',
    });
    expect(m.libro.procesados.get('documento-1')).toBe(true);
    expect(m.bancos.cheques).toEqual([]);
    expect(m.bancos.notas).toHaveLength(1);
    expect(m.bancos.notas[0]).toMatchObject({
      tipo: 'credito',
      montoCentavos: 950_000,
      cuentaBancariaId: 'cuenta-1',
      referencia: 'BOL-1',
      beneficiario: 'Juan Pérez',
      origen: { modulo: 'caja-chica', documentoId: FONDO_ID },
      conceptos: [{ claveDeSistema: 'devolucion_de_fondo_de_caja_chica', montoCentavos: 950_000 }],
    });
    expect(m.fondos.cambiosDe.get(FONDO_ID)).toMatchObject([
      { tipo: 'cierre', forma: 'nota_de_credito', montoCentavos: 950_000 },
    ]);
    expect(gasto.id).toBeDefined();
  });

  it('audita cerrar con el fondo como estaba y publica fondo_cerrado con la compensada', async () => {
    await sembrarComprobante(m, { montoCentavos: 30_000 });

    await cerrar();

    expect(m.auditoria.entradas).toMatchObject([
      { recurso: 'caja-chica.fondos', registroId: FONDO_ID, accion: 'cerrar', anterior: { estado: 'abierto' } },
    ]);
    expect(m.publicador.nombres()).toEqual(['caja-chica.fondo_cerrado']);
    const evento = m.publicador.publicados[0]!.datos as any;
    expect(evento).toMatchObject({ fondoId: FONDO_ID, depositoCentavos: 970_000, reposicionCompensada: { numero: 1 } });
    expect(evento.reposicionCompensada.lineas).toHaveLength(1);
  });
});

describe('CerrarFondo: otros caminos', () => {
  it('sin pendiente no hay reposición compensada y deposita todo el fondo', async () => {
    await cerrar();

    expect(m.reposiciones.filas.size).toBe(0);
    expect(m.bancos.notas[0]).toMatchObject({ montoCentavos: 1_000_000 });
  });

  it('sin efectivo que depositar no pide la nota a Bancos y el cierre queda sin depósito', async () => {
    await sembrarComprobante(m, { montoCentavos: 1_000_000 });

    await cerrar({ cuentaBancariaId: null });

    expect(m.bancos.notas).toEqual([]);
    expect(m.fondos.cambiosDe.get(FONDO_ID)).toMatchObject([
      { tipo: 'cierre', forma: 'sin_deposito', montoCentavos: 0, movimientoId: null },
    ]);
    expect([...m.reposiciones.filas.values()][0]).toMatchObject({ montoCentavos: 1_000_000 });
  });

  it('lo que no suma más que cero (solo un sobrante) no crea reposición y su efectivo se deposita', async () => {
    await sembrarComprobante(m, { clase: 'sobrante', montoCentavos: 5_000, resta: true });

    await cerrar();

    expect(m.reposiciones.filas.size).toBe(0);
    expect(m.bancos.notas[0]).toMatchObject({ montoCentavos: 1_005_000 });
  });

  it('rechaza con vales provisionales abiertos y no toca nada', async () => {
    valesCentavos = 20_000;

    await expect(cerrar()).rejects.toMatchObject({ codigo: 'fondo_con_vales_abiertos' });
    expect(m.bancos.notas).toEqual([]);
    expect(m.auditoria.entradas).toEqual([]);
  });

  it('rechaza si el efectivo esperado sería negativo', async () => {
    await sembrarComprobante(m, { montoCentavos: 1_100_000 });

    await expect(cerrar()).rejects.toMatchObject({ codigo: 'efectivo_negativo_al_cerrar' });
  });

  it('con efectivo y sin cuenta del depósito (ni del fondo) la pide', async () => {
    await expect(cerrar({ cuentaBancariaId: null })).rejects.toMatchObject({
      codigo: 'cuenta_del_deposito_obligatoria',
    });
  });

  it('rechaza una fecha futura, anterior a la apertura o anterior a un comprobante pendiente', async () => {
    await sembrarComprobante(m, { montoCentavos: 10_000, fecha: '2026-11-10' });

    await expect(cerrar({ fecha: '2026-11-19' })).rejects.toMatchObject({ codigo: 'fecha_del_fondo_invalida' });
    await expect(cerrar({ fecha: '2026-10-31' })).rejects.toMatchObject({ codigo: 'fecha_anterior_a_la_apertura' });
    await expect(cerrar({ fecha: '2026-11-05' })).rejects.toMatchObject({ codigo: 'fecha_de_la_reposicion_invalida' });
  });

  it('un fondo cerrado no se cierra otra vez', async () => {
    await cerrar();

    await expect(cerrar()).rejects.toMatchObject({ codigo: 'fondo_no_disponible' });
  });
});
