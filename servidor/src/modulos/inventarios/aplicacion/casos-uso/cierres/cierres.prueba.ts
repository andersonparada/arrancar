import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { ArticuloAlCorte } from '../../../dominio/cierre/existencias-del-cierre.js';
import {
  CierreConBloqueos,
  CierreSinAlcanceTotal,
  MesAnteriorAlInicio,
  MesAnteriorSinCerrar,
  MesPorLlegar,
  MotivoDeReaperturaInvalido,
  RevisionDelCierreDesactualizada,
  SinMesPorCerrar,
  SoloSeReabreElUltimo,
} from '../../../dominio/errores-de-cierre.js';
import { MesCerrado } from '../../../dominio/errores-de-kardex.js';
import { EscenarioDeCierres } from '../../../pruebas/dobles-de-cierres.js';

const libras = (cantidad: number): bigint => BigInt(cantidad) * 10_000n;
const articulo = (cambios: Partial<ArticuloAlCorte> = {}): ArticuloAlCorte => ({
  articuloId: 'art-1',
  tipoDeInventario: 'mercaderia',
  cantidad: libras(150),
  valor: 31_500n,
  porBodega: [
    { bodegaId: 'b-1', cantidad: libras(100) },
    { bodegaId: 'b-2', cantidad: libras(50) },
  ],
  enTransito: [],
  ...cambios,
});

let e: EscenarioDeCierres;

beforeEach(() => {
  e = new EscenarioDeCierres();
  e.consultas.articulos = [articulo()];
  e.consultas.primerMes = '2026-07-01';
});

describe('el orden de los cierres', () => {
  it('el primer mes es el de la fecha de inicio de la empresa', async () => {
    e.carga.fechaDeInicio = '2026-08-15';
    e.carga.cerrada = true;

    expect((await e.listar.ejecutar(e.operador)).siguienteMes).toBe('2026-08-01');
    await expect(e.cerrarMes('2026-09-01')).rejects.toBeInstanceOf(MesAnteriorSinCerrar);
    await expect(e.cerrarMes('2026-07-01')).rejects.toBeInstanceOf(MesAnteriorAlInicio);
    await e.cerrarMes('2026-08-01');
    expect((await e.listar.ejecutar(e.operador)).siguienteMes).toBe('2026-09-01');
  });

  it('sin fecha de inicio es el del primer movimiento; sin nada, no hay mes por cerrar', async () => {
    expect((await e.listar.ejecutar(e.operador)).siguienteMes).toBe('2026-07-01');

    e.consultas.primerMes = null;
    expect((await e.listar.ejecutar(e.operador)).siguienteMes).toBeNull();
    await expect(e.cerrarMes('2026-07-01')).rejects.toBeInstanceOf(SinMesPorCerrar);
  });

  it('un mes que no es el siguiente no se valúa: la revisión solo dice cuál cerrar primero', async () => {
    const revision = await e.revisarMes('2026-09-01');

    expect(revision.puedeCerrar).toBe(false);
    expect(revision.hallazgos.map((h) => h.codigo)).toEqual(['mes_anterior_sin_cerrar']);
    expect(e.consultas.cortes).toEqual([]);
    await expect(e.cerrarMes('2026-09-01')).rejects.toMatchObject({ detalles: { siguiente: '2026-07-01' } });
  });

  it('un mes posterior al mes en curso no se cierra', async () => {
    await expect(e.cerrarMes('2026-12-01')).rejects.toBeInstanceOf(MesPorLlegar);
    expect((await e.revisarMes('2026-12-01')).hallazgos.map((h) => h.codigo)).toEqual(['mes_por_llegar']);
  });

  it('un mes cerrado no se cierra ni se revisa de nuevo', async () => {
    await e.cerrarMes('2026-07-01');

    await expect(e.cerrarMes('2026-07-01')).rejects.toBeInstanceOf(MesCerrado);
    await expect(e.revisarMes('2026-07-01')).rejects.toBeInstanceOf(MesCerrado);
  });
});

describe('cerrar', () => {
  it('valúa al último día del mes, guarda la foto, audita y publica mes_cerrado con el valor por tipo', async () => {
    e.consultas.regimen = 'utilidades';

    const cierre = await e.cerrarMes('2026-07-01');

    expect(e.consultas.cortes).toEqual(['2026-07-31']);
    expect(cierre).toMatchObject({
      periodo: '2026-07-01',
      estado: 'cerrado',
      valorTotal: '315.00',
      articulosConExistencia: 1,
      metodo: 'promedio_ponderado',
      regimenIsr: 'utilidades',
    });
    expect(e.repositorio.candados).toBe(1);
    expect(e.repositorio.fotos).toHaveLength(2);
    expect(e.auditoria.acciones()).toEqual(['inventarios.cierres:cerrar']);
    expect(e.publicador.publicados).toMatchObject([
      {
        nombre: 'inventarios.mes_cerrado',
        datos: {
          periodo: '2026-07-01',
          valorTotalCentavos: 31_500,
          porTipo: [{ tipoDeInventario: 'mercaderia', valorCentavos: 31_500 }],
        },
      },
    ]);
  });

  it('una huella de una revisión vieja se rechaza con la revisión nueva; la actual sirve', async () => {
    const revisada = await e.revisarMes('2026-07-01');
    e.consultas.articulos = [articulo({ valor: 40_000n })];

    const rechazo = await e.cerrarMes('2026-07-01', revisada.huella).catch((error) => error);

    expect(rechazo).toBeInstanceOf(RevisionDelCierreDesactualizada);
    expect(rechazo.detalles.totales.valorTotal).toBe('400.00');
    await expect(e.cerrarMes('2026-07-01', rechazo.detalles.huella)).resolves.toMatchObject({ valorTotal: '400.00' });
  });

  it('un bloqueo impide cerrar y no guarda nada; un aviso no', async () => {
    e.consultas.base = { ...e.consultas.base, trasladosEnTransito: 1 };
    e.bandeja.lineas = 2;
    expect((await e.revisarMes('2026-07-01')).hallazgos.map((h) => h.nivel)).toEqual(['aviso', 'aviso']);

    e.consultas.base = {
      ...e.consultas.base,
      recepcionesDeDocumentosAnulados: { cantidad: 1, referencias: ['Recepción 4'] },
    };
    await expect(e.cerrarMes('2026-07-01')).rejects.toBeInstanceOf(CierreConBloqueos);
    expect(e.repositorio.cierres.size).toBe(0);
    expect(e.publicador.publicados).toEqual([]);
  });

  it('la carga inicial abierta bloquea solo si hay saldos iniciales', async () => {
    expect((await e.revisarMes('2026-07-01')).puedeCerrar).toBe(true);

    e.consultas.base = { ...e.consultas.base, conSaldosIniciales: true };

    expect((await e.revisarMes('2026-07-01')).hallazgos.map((h) => h.codigo)).toEqual(['carga_inicial_abierta']);
    e.carga.cerrada = true;
    expect((await e.revisarMes('2026-07-01')).puedeCerrar).toBe(true);
  });

  it('lo que dicen los demás módulos entra en la revisión y un bloqueo suyo impide cerrar', async () => {
    e.preguntas.hallazgos = [
      {
        nivel: 'bloquea',
        codigo: 'obra_pendiente',
        mensaje: 'Hay una obra sin capitalizar.',
        cantidad: 1,
        detalle: [],
      },
    ];

    expect((await e.revisarMes('2026-07-01')).hallazgos.map((h) => h.codigo)).toEqual(['obra_pendiente']);
    await expect(e.cerrarMes('2026-07-01')).rejects.toBeInstanceOf(CierreConBloqueos);
  });

  it('revisar, cerrar y reabrir exigen ver todas las bodegas', async () => {
    const parcial = { verCostos: true, veTodasLasBodegas: false };

    await expect(e.revisarMes('2026-07-01', parcial)).rejects.toBeInstanceOf(CierreSinAlcanceTotal);
    await expect(e.cerrarMes('2026-07-01', undefined, parcial)).rejects.toBeInstanceOf(CierreSinAlcanceTotal);
    await expect(e.reabrirMes('2026-07-01', 'x', parcial)).rejects.toBeInstanceOf(CierreSinAlcanceTotal);
  });
});

describe('reabrir', () => {
  beforeEach(async () => {
    await e.cerrarMes('2026-07-01');
    await e.cerrarMes('2026-08-01');
  });

  it('solo el último mes cerrado, con motivo', async () => {
    await expect(e.reabrirMes('2026-07-01')).rejects.toBeInstanceOf(SoloSeReabreElUltimo);
    await expect(e.reabrirMes('2026-08-01', '   ')).rejects.toBeInstanceOf(MotivoDeReaperturaInvalido);
    await expect(e.reabrirMes('2026-08-01', 'x'.repeat(501))).rejects.toBeInstanceOf(MotivoDeReaperturaInvalido);
  });

  it('suelta la foto, audita con el valor por tipo y publica mes_reabierto; el mes vuelve a ser el siguiente', async () => {
    const reabierto = await e.reabrirMes('2026-08-01', '  Faltó una compra  ');

    expect(reabierto).toMatchObject({ estado: 'reabierto', motivoDeReapertura: 'Faltó una compra' });
    expect(e.repositorio.fotos.filter((f) => f.periodo === '2026-08-01' && f.vigente)).toEqual([]);
    expect(e.repositorio.fotos.filter((f) => f.periodo === '2026-07-01' && f.vigente)).toHaveLength(2);
    const reapertura = e.auditoria.entradas.at(-1)!;
    expect(reapertura).toMatchObject({ accion: 'reabrir', motivo: 'Faltó una compra' });
    expect(reapertura.anterior).toMatchObject({
      valorTotal: '315.00',
      porTipo: [{ tipoDeInventario: 'mercaderia', valor: '315.00' }],
    });
    expect(e.publicador.nombres().at(-1)).toBe('inventarios.mes_reabierto');
    expect((await e.listar.ejecutar(e.operador)).siguienteMes).toBe('2026-08-01');
  });

  it('el mes reabierto no tiene existencias al cierre hasta que se cierra otra vez', async () => {
    await e.reabrirMes('2026-08-01');

    await expect(e.existencias.ejecutar(e.operador, { periodo: '2026-08-01', vista: e.vista })).rejects.toBeInstanceOf(
      RecursoNoEncontrado,
    );
    await e.cerrarMes('2026-08-01');
    expect(await e.existencias.ejecutar(e.operador, { periodo: '2026-08-01', vista: e.vista })).toHaveLength(2);
  });
});

describe('las existencias al cierre', () => {
  it('sin costos.ver llevan solo las cantidades', async () => {
    await e.cerrarMes('2026-07-01');

    const [fila] = await e.existencias.ejecutar(e.operador, {
      periodo: '2026-07-01',
      vista: { verCostos: false, veTodasLasBodegas: true },
    });

    expect(fila).toMatchObject({ cantidad: '100.0000', costoUnitario: null, valor: null });
  });
});
