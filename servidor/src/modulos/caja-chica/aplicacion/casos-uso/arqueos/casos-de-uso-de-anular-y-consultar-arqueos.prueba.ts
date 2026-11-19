import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { FONDO_ID } from '../comprobantes/dobles-de-comprobantes.soporte.js';
import { ObtenerFondo } from '../fondos/consultas-de-fondos.js';
import { sembrarComprobante } from '../reposiciones/dobles-de-reposiciones.soporte.js';
import { AnularArqueo } from './anular-arqueo.js';
import { ListarArqueos, ObtenerArqueo, ProponerArqueo } from './consultas-de-arqueos.js';
import { armarEscenarioDeArqueos, cienesDeQuetzal } from './dobles-de-arqueos.soporte.js';
import { RegistrarArqueo } from './registrar-arqueo.js';

const operador = operadorDePrueba();
let m: Awaited<ReturnType<typeof armarEscenarioDeArqueos>>;

const registrar = (billetes: number, motivo?: string) =>
  new RegistrarArqueo(m.dependenciasDeArqueos).ejecutar(operador, {
    fondoId: FONDO_ID,
    conteo: cienesDeQuetzal(billetes),
    comprobantesCompletos: true,
    ...(motivo ? { motivoDeDiferencia: motivo, destinoDelFaltante: billetes < 100 ? ('perdida' as const) : null } : {}),
  });

const anular = (arqueoId: string, motivo = 'Se contó mal') =>
  new AnularArqueo(m.dependenciasDeArqueos).ejecutar(operador, { arqueoId, motivo });

beforeEach(async () => {
  m = await armarEscenarioDeArqueos();
});

describe('AnularArqueo', () => {
  it('anula el arqueo y su faltante, audita «anular» con el arqueo como estaba y publica el evento', async () => {
    const arqueo = await registrar(99, 'Faltó un billete');
    m.auditoria.entradas.length = 0;

    const anulado = await anular(arqueo.id);

    expect(anulado).toMatchObject({
      estado: 'anulado',
      motivoDeAnulacion: 'Se contó mal',
      fechaDeAnulacion: '2026-11-18',
    });
    expect(anulado.comprobante).toMatchObject({ estado: 'anulado' });
    expect(m.comprobantes.pendienteDe(FONDO_ID)).toBe(0);
    expect(m.auditoria.entradas).toMatchObject([
      {
        recurso: 'caja-chica.arqueos',
        accion: 'anular',
        motivo: 'Se contó mal',
        anterior: { estado: 'vigente', diferencia: '-100.00' },
      },
    ]);
    expect(m.publicador.nombres().at(-1)).toBe('caja-chica.arqueo_anulado');
  });

  it('un arqueo cuadrado de la noche (ya es el día siguiente en UTC) se anula con el día de la empresa', async () => {
    const noche = '2026-11-18T02:00:00Z';
    const arqueo = await new RegistrarArqueo(m.dependenciasDeArqueos).ejecutar(operador, {
      fondoId: FONDO_ID,
      realizadoEn: noche,
      conteo: cienesDeQuetzal(100),
      comprobantesCompletos: true,
    });

    const anulado = await anular(arqueo.id);

    const [registrado, anuladoEvento] = m.publicador.publicados.map((e) => (e.datos as { fecha: string }).fecha);
    expect(registrado).toBe('2026-11-17');
    expect(anuladoEvento).toBe('2026-11-17');
    expect(anulado.fechaDeAnulacion).toBe('2026-11-18');
  });

  it('un arqueo sin diferencia también se anula, y no se anula dos veces', async () => {
    const arqueo = await registrar(100);

    const anulado = await anular(arqueo.id);

    expect(anulado).toMatchObject({ estado: 'anulado', comprobante: null });
    await expect(anular(arqueo.id)).rejects.toMatchObject({ codigo: 'arqueo_ya_anulado' });
  });

  it('no se anula si su faltante ya está en una reposición vigente', async () => {
    const arqueo = await registrar(99, 'Faltó un billete');
    m.comprobantes.filas.set(arqueo.comprobante!.id, {
      ...m.comprobantes.filas.get(arqueo.comprobante!.id)!,
      reposicionNumero: 4,
    });

    await expect(anular(arqueo.id)).rejects.toMatchObject({ codigo: 'arqueo_con_comprobante_repuesto' });
    expect(m.arqueos.filas.get(arqueo.id)!.estado).toBe('vigente');
  });

  it('anular un sobrante no puede dejar el efectivo esperado negativo', async () => {
    const arqueo = await registrar(101, 'Sobró un billete');
    await sembrarComprobante(m, { montoCentavos: 1_005_000 });

    await expect(anular(arqueo.id)).rejects.toMatchObject({ codigo: 'comprobantes_mayores_que_el_efectivo' });
  });

  it('un arqueo que no existe responde «no encontrado»', async () => {
    await expect(anular('no-existe')).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});

describe('consultas de los arqueos', () => {
  it('la lista del fondo y el acta traen lo registrado', async () => {
    const arqueo = await registrar(99, 'Faltó un billete');

    const lista = await new ListarArqueos(m.dependenciasDeArqueos).ejecutar(operador, FONDO_ID);
    const acta = await new ObtenerArqueo(m.dependenciasDeArqueos).ejecutar(operador, arqueo.id);

    expect(lista).toMatchObject([{ id: arqueo.id, diferencia: '-100.00', estado: 'vigente' }]);
    expect(acta).toMatchObject({
      id: arqueo.id,
      motivoDeDiferencia: 'Faltó un billete',
      destinoDelFaltante: 'perdida',
    });
  });

  it('la propuesta dice cuánto se espera, las denominaciones y los pendientes que hay que ver', async () => {
    await sembrarComprobante(m, { montoCentavos: 25_000 });

    const propuesta = await new ProponerArqueo(m.dependenciasDeArqueos).ejecutar(operador, FONDO_ID);

    expect(propuesta).toMatchObject({
      fondoNombre: 'Caja',
      monto: '10000.00',
      pendienteDeReponer: '250.00',
      efectivoEsperado: '9750.00',
      avisos: [],
    });
    expect(propuesta.denominaciones).toEqual([
      '200.00',
      '100.00',
      '50.00',
      '20.00',
      '10.00',
      '5.00',
      '1.00',
      '0.50',
      '0.25',
      '0.10',
      '0.05',
      '0.01',
    ]);
    expect(propuesta.pendientes).toHaveLength(1);
  });
});

describe('el aviso «sin arqueo»', () => {
  const dependenciasDeFondos = () => ({
    unidadDeTrabajo: m.dependencias.unidadDeTrabajo,
    fondos: m.fondos,
    consultas: m.dependencias.consultasDeFondos,
    reloj: m.dependencias.reloj,
    configuracionDeArqueos: {
      diasParaAvisar: async () => m.valores.dias,
      diasParaAvisarDeVales: async () => m.valores.diasDeVales,
    },
  });
  const ficha = () => new ObtenerFondo(dependenciasDeFondos()).ejecutar(operador, FONDO_ID);

  it('un fondo reciente no avisa; uno de más de 30 días sin arquear, sí; con 0 días, nunca', async () => {
    expect((await ficha()).avisos).toEqual([]);
    m.fondos.fondos.set(FONDO_ID, { ...m.fondos.fondos.get(FONDO_ID)!, fechaDeApertura: '2026-09-01' });

    expect((await ficha()).avisos).toEqual(['El fondo lleva 78 días sin arquearse.']);
    m.valores.dias = 0;
    expect((await ficha()).avisos).toEqual([]);
  });
});
