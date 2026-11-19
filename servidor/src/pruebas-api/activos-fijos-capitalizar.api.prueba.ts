/**
 * Capitalizar desde la bandeja (AF-3 y AFI-2): activos nuevos en N unidades con su cuadrícula, el reparto con el
 * sobrante en el último, códigos repetidos, tope de 200, compra conjunta, grupos y la regla de la línea.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '../modulos/core/contratos/activos-fijos.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import {
  asignacionNueva,
  capitalizar,
  costosDeActivo,
  prepararBandeja,
  registrarDocumento,
  RUTA_ACTIVOS,
  type EscenarioDeBandeja,
} from './soporte/escenario-de-bandeja-de-activos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeBandeja;
const eventos: { activoId: string; costos: { montoCentavos: number }[]; altaConjuntaId: string | null }[] = [];

const activos = async () => (await e.cuenta.propietario.get(RUTA_ACTIVOS)).cuerpo as Array<Record<string, any>>;
/** Una factura de una línea con el costo dado (el total lleva IVA: Q1,120.00 son Q1,000.00 de costo). */
const factura = (total: string) =>
  registrarDocumento(e, { lineas: [{ conceptoId: e.conceptoDeActivoId, total, esActivoFijo: true }] });

beforeAll(async () => {
  instalarDestinoFalso();
  busEventos.suscribir('activos-fijos.activo_capitalizado', (datos) => {
    eventos.push(datos);
  });
  e = await prepararBandeja(entorno, 'afcapitalizar');
});

afterAll(() => vi.restoreAllMocks());

describe('capitalizar una línea en un activo nuevo', () => {
  it('crea el activo en construcción con su costo, la fecha del documento y el código propuesto, y publica el evento', async () => {
    const { lineaIds } = await factura('1120.00');

    const respuesta = await capitalizar(e, [
      asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '1000.00', marca: 'John Deere' }),
    ]);

    expect(respuesta.estado).toBe(201);
    const { activos: creados, costos } = respuesta.cuerpo;
    expect(costos).toBe(1);
    expect(creados[0]).toMatchObject({ codigo: 'AF-0001', costo: '1000.00' });
    const ficha = (await e.cuenta.propietario.get(`${RUTA_ACTIVOS}/${creados[0].id}`)).cuerpo;
    expect(ficha).toMatchObject({ estado: 'en_construccion', marca: 'John Deere', cantidad: 1, costo: '1000.00' });
    const lista = await costosDeActivo(e, creados[0].id);
    expect(lista.cuerpo.total).toBe('1000.00');
    expect(lista.cuerpo.costos[0]).toMatchObject({
      origen: 'linea_de_compra',
      claseDeCosto: 'adquisicion',
      monto: '1000.00',
      documento: expect.stringContaining('A-'),
      proveedorNombre: 'Veterinaria El Quiroa',
      aplicaAlLibroFiscal: true,
    });
    expect(eventos.at(-1)).toMatchObject({ activoId: creados[0].id, altaConjuntaId: null });
    expect(eventos.at(-1)?.costos.map((c) => c.montoCentavos)).toEqual([100_000]);
  });

  it('una línea se reparte entre varios activos y varias líneas suman a uno', async () => {
    const { lineaIds: compra } = await factura('1120.00');
    const { lineaIds: flete } = await factura('224.00');
    const [camion] = (
      await capitalizar(e, [asignacionNueva(e, { lineaId: compra[0]!, monto: '700.00', descripcion: 'Camión' })])
    ).cuerpo.activos;
    const [remolque] = (
      await capitalizar(e, [asignacionNueva(e, { lineaId: compra[0]!, monto: '300.00', descripcion: 'Remolque' })])
    ).cuerpo.activos;

    const suma = await capitalizar(e, [
      { lineaId: flete[0], monto: '200.00', activoId: camion.id, claseDeCosto: 'flete' },
    ]);

    expect(suma.estado).toBe(201);
    expect(suma.cuerpo.activos[0].id).toBe(camion.id);
    expect((await costosDeActivo(e, camion.id)).cuerpo.total).toBe('900.00');
    expect((await costosDeActivo(e, remolque.id)).cuerpo.total).toBe('300.00');
    expect(
      (await costosDeActivo(e, camion.id)).cuerpo.costos.map((c: { claseDeCosto: string }) => c.claseDeCosto),
    ).toEqual(['adquisicion', 'flete']);
  });

  it('50 sillas son un grupo (cantidad 50) y un bien de control nace en uso', async () => {
    const { lineaIds } = await factura('1680.00');

    const grupo = await capitalizar(e, [
      asignacionNueva(e, {
        lineaId: lineaIds[0]!,
        monto: '1000.00',
        descripcion: 'Silla apilable',
        cantidadPorActivo: 50,
      }),
      asignacionNueva(e, {
        lineaId: lineaIds[0]!,
        monto: '500.00',
        descripcion: 'Silla de visita',
        tipoDeRegistro: 'bien_de_control',
      }),
    ]);

    expect(grupo.estado).toBe(201);
    const fichas = await Promise.all(
      grupo.cuerpo.activos.map(
        async (a: { id: string }) => (await e.cuenta.propietario.get(`${RUTA_ACTIVOS}/${a.id}`)).cuerpo,
      ),
    );
    expect(fichas.map((f) => [f.descripcion, f.cantidad, f.tipoDeRegistro, f.estado])).toEqual([
      ['Silla apilable', 50, 'activo', 'en_construccion'],
      ['Silla de visita', 1, 'bien_de_control', 'en_uso'],
    ]);
  });
});

describe('capitalizar en N unidades (AFI-2)', () => {
  it('3 tractores de Q750,000.01: 250,000.00, 250,000.00 y 250,000.01 con la misma compra conjunta', async () => {
    const { lineaIds } = await factura('840000.01');
    const total = '750000.01';

    const respuesta = await capitalizar(e, [
      asignacionNueva(e, { lineaId: lineaIds[0]!, monto: total, unidades: 3, modelo: '5075E' }),
    ]);

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.activos.map((a: { costo: string }) => a.costo)).toEqual([
      '250000.00',
      '250000.00',
      '250000.01',
    ]);
    expect(respuesta.cuerpo.altaConjuntaIds).toHaveLength(1);
    const lista = (await activos()).filter((a) => a.altaConjuntaId === respuesta.cuerpo.altaConjuntaIds[0]);
    expect(lista).toHaveLength(3);
    expect(lista.every((a) => a.modelo === '5075E' && a.cantidad === 1)).toBe(true);
    expect(eventos.filter((ev) => ev.altaConjuntaId === respuesta.cuerpo.altaConjuntaIds[0])).toHaveLength(3);
  });

  it('la cuadrícula pone serie, placa y código a cada unidad; las demás toman el código propuesto', async () => {
    const { lineaIds } = await factura('336.00');

    const respuesta = await capitalizar(e, [
      asignacionNueva(e, {
        lineaId: lineaIds[0]!,
        monto: '300.00',
        unidades: 3,
        detalleDeUnidades: [
          { codigo: 'TR-01', numeroDeSerie: 'JD-1', placa: 'P-111AAA' },
          { numeroDeSerie: 'JD-2', placa: 'P-222BBB', marca: 'Case' },
        ],
      }),
    ]);

    expect(respuesta.estado).toBe(201);
    const porId = new Map((await activos()).map((a) => [a.id, a]));
    const fichas = respuesta.cuerpo.activos.map((a: { id: string }) => porId.get(a.id)!);
    expect(fichas.map((f: Record<string, unknown>) => [f.numeroDeSerie, f.placa, f.marca])).toEqual([
      ['JD-1', 'P-111AAA', null],
      ['JD-2', 'P-222BBB', 'Case'],
      [null, null, null],
    ]);
    expect(fichas[0].codigo).toBe('TR-01');
    expect(fichas[1].codigo).toMatch(/^AF-\d{4}$/);
    expect(fichas[2].codigo).toMatch(/^AF-\d{4}$/);
    expect(fichas[1].codigo).not.toBe(fichas[2].codigo);
  });

  it('códigos repetidos en la cuadrícula o ya usados se rechazan con su renglón y no se guarda nada', async () => {
    const { lineaIds } = await factura('336.00');
    const antes = (await activos()).length;
    const unidad = (codigo: string) => ({ codigo });

    const repetidos = await capitalizar(e, [
      asignacionNueva(e, {
        lineaId: lineaIds[0]!,
        monto: '300.00',
        unidades: 3,
        detalleDeUnidades: [unidad('X-1'), unidad('x-1')],
      }),
    ]);
    const usado = await capitalizar(e, [
      asignacionNueva(e, {
        lineaId: lineaIds[0]!,
        monto: '300.00',
        unidades: 2,
        detalleDeUnidades: [unidad('LIBRE'), unidad('tr-01')],
      }),
    ]);

    expect(repetidos.estado).toBe(400);
    expect(repetidos.cuerpo.error).toMatchObject({
      codigo: 'codigos_de_unidades_repetidos',
      detalles: {
        renglones: [
          { asignacion: 0, renglon: 0, codigo: 'X-1', causa: 'repetido_en_la_cuadricula' },
          { asignacion: 0, renglon: 1, codigo: 'x-1', causa: 'repetido_en_la_cuadricula' },
        ],
      },
    });
    expect(usado.cuerpo.error.detalles.renglones).toEqual([
      { asignacion: 0, renglon: 1, codigo: 'tr-01', causa: 'ya_usado_por_otro_activo' },
    ]);
    expect((await activos()).length).toBe(antes);
    const costosHuerfanos = await comoPropietario<{ n: string }>(
      'select count(*) n from activos_fijos.costos where linea_de_documento_id = $1',
      [lineaIds[0]],
    );
    expect(costosHuerfanos[0]!.n).toBe('0');
  });
});
