/**
 * Mejoras y costos posteriores (AF-7): tramos nuevos hacia adelante con lo depreciado de los meses abiertos, costos
 * de líneas del libro y a mano, el tramo que sustituye al del mismo mes, anular con auditoría, lo que se rechaza,
 * permisos y aislamiento entre cuentas.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { instalarDestinoFalso, HOY } from './soporte/escenario-de-documentos.js';
import { datosDeActivo } from './soporte/escenario-de-activos.js';
import {
  asignacionNueva,
  capitalizar,
  prepararBandeja,
  registrarDocumento,
  type EscenarioDeBandeja,
} from './soporte/escenario-de-bandeja-de-activos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/activos-fijos/activos';
const MEJORAS = '/api/activos-fijos/mejoras';
const entorno = usarEntornoApi();
let e: EscenarioDeBandeja;
let ajena: CuentaDePrueba;

const costoManual = (monto: string) => ({
  claseDeCosto: 'adquisicion',
  fecha: '2026-09-05',
  monto,
  documentoDeSoporte: 'Escritura 15',
});

/** Un vehículo de Q250,000.00 puesto en uso el 10 de septiembre de 2026 (fiscal 20 %, contable 60 meses). */
async function pickUp(): Promise<string> {
  const creado = await e.cuenta.propietario.post(
    RUTA,
    datosDeActivo(e.claseVehiculosId, { fechaDeAdquisicion: '2026-09-01' }),
  );
  const id = creado.cuerpo.id as string;
  await e.cuenta.propietario.post(`${RUTA}/${id}/costos`, costoManual('250000.00'));
  const puesto = await e.cuenta.propietario.post(`${RUTA}/${id}/poner-en-uso`, { fechaDeInicioDeUso: '2026-09-10' });
  expect(puesto.estado, JSON.stringify(puesto.cuerpo)).toBe(200);
  return id;
}

const mejora = (activoId: string, cambios: Record<string, unknown> = {}) => ({
  activoId,
  clase: 'mejora',
  fecha: '2026-11-10',
  descripcion: 'Motor nuevo',
  lineas: [],
  costosManuales: [{ claseDeCosto: 'otro', monto: '50000.00', documentoDeSoporte: 'Factura 55' }],
  ...cambios,
});

const tramosDe = async (activoId: string) =>
  ((await e.cuenta.propietario.get(`${RUTA}/${activoId}`)).cuerpo.tramos as Array<Record<string, string | number>>).map(
    ({ libro, causa, desdePeriodo, meses, porDepreciar, baseDelPorcentaje, cuotaMensual }) => ({
      ...{ libro, causa, desdePeriodo, meses, porDepreciar, baseDelPorcentaje, cuotaMensual },
    }),
  );

beforeAll(async () => {
  instalarDestinoFalso();
  e = await prepararBandeja(entorno, 'afmejoras');
  ajena = await darDeAltaCuenta(entorno, {
    nombre: 'Mejoras ajena',
    usuario: 'propietariomejorasajeno',
    modulos: ['terceros', 'libro-de-compras', 'activos-fijos'],
  });
});

afterAll(() => vi.restoreAllMocks());

describe('registrar una mejora a mano', () => {
  it('abre los dos tramos desde el mes de la mejora con lo depreciado de los meses abiertos (V-3)', async () => {
    const id = await pickUp();

    const respuesta = await e.cuenta.propietario.post(MEJORAS, mejora(id));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      clase: 'mejora',
      monto: '50000.00',
      cantidadDeCostos: 1,
      estado: 'vigente',
    });
    const nuevos = (await tramosDe(id)).filter((tramo) => tramo.causa === 'mejora');
    expect(nuevos).toEqual([
      expect.objectContaining({
        libro: 'contable',
        desdePeriodo: '2026-11-01',
        meses: 58,
        porDepreciar: '291666.66',
        cuotaMensual: '5028.74',
      }),
      expect.objectContaining({
        libro: 'fiscal',
        desdePeriodo: '2026-11-01',
        baseDelPorcentaje: '291666.66',
        cuotaMensual: '4861.11',
      }),
    ]);
    const lista = await e.cuenta.propietario.get(`${RUTA}/${id}/mejoras`);
    expect(lista.cuerpo).toHaveLength(1);
    const costos = (await e.cuenta.propietario.get(`${RUTA}/${id}/costos`)).cuerpo;
    expect(costos.total).toBe('300000.00');
    expect(costos.costos.map((c: { mejoraId: string | null }) => c.mejoraId)).toEqual([null, respuesta.cuerpo.id]);
  });

  it('un costo posterior no reinicia la vida: la base fiscal total corregida sigue al mismo porcentaje', async () => {
    const id = await pickUp();

    const respuesta = await e.cuenta.propietario.post(
      MEJORAS,
      mejora(id, {
        clase: 'costo_posterior',
        costosManuales: [{ claseDeCosto: 'flete', monto: '5000.00', documentoDeSoporte: 'Flete 8' }],
      }),
    );

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    const fiscal = (await tramosDe(id)).find((tramo) => tramo.causa === 'costo_posterior' && tramo.libro === 'fiscal');
    expect(fiscal).toMatchObject({
      baseDelPorcentaje: '255000.00',
      cuotaMensual: '4250.00',
      porDepreciar: '246666.66',
    });
  });
});

describe('desde las líneas del libro, en el mismo mes del uso', () => {
  it('sustituye el tramo del mes, deja el costo con su mejora y anularla lo repone y libera la línea', async () => {
    const { lineaIds: compra } = await registrarDocumento(e);
    const creado = await capitalizar(e, [asignacionNueva(e, { lineaId: compra[0]!, monto: '1000.00' })]);
    const id = creado.cuerpo.activos[0].id as string;
    expect((await e.cuenta.propietario.post(`${RUTA}/${id}/poner-en-uso`, { fechaDeInicioDeUso: HOY })).estado).toBe(
      200,
    );
    const { lineaIds } = await registrarDocumento(e);

    const registrada = await e.cuenta.propietario.post(
      MEJORAS,
      mejora(id, { fecha: HOY, costosManuales: [], lineas: [{ lineaId: lineaIds[0], monto: '1000.00' }] }),
    );

    expect(registrada.estado, JSON.stringify(registrada.cuerpo)).toBe(201);
    expect((await tramosDe(id)).map((t) => t.causa)).toEqual(['mejora', 'mejora']);
    const otra = await e.cuenta.propietario.post(
      MEJORAS,
      mejora(id, { fecha: HOY, costosManuales: [], lineas: [{ lineaId: lineaIds[0], monto: '0.01' }] }),
    );
    expect(otra.cuerpo.error.codigo).toBe('linea_sobrecapitalizada');

    const anulada = await e.cuenta.propietario.post(`${MEJORAS}/${registrada.cuerpo.id}/anular`, {
      motivo: 'Era gasto',
    });

    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
    expect(anulada.cuerpo).toMatchObject({ estado: 'anulada', monto: '0.00' });
    expect((await tramosDe(id)).map((t) => t.causa)).toEqual(['inicio_de_uso', 'inicio_de_uso']);
    const auditoria = await comoPropietario<{ anterior: { monto: string } }>(
      "select anterior from core.auditoria where recurso = 'activos-fijos.mejoras' and accion = 'anular' and registro_id = $1",
      [registrada.cuerpo.id],
    );
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]!.anterior.monto).toBe('1000.00');
    const reintento = await e.cuenta.propietario.post(`${MEJORAS}/${registrada.cuerpo.id}/anular`, {
      motivo: 'Otra vez',
    });
    expect(reintento.cuerpo.error.codigo).toBe('mejora_no_anulable');
  });
});

describe('lo que se rechaza', () => {
  it('una fecha futura, anterior al uso o sin costos; un activo en construcción; quitar de uso con mejoras', async () => {
    const id = await pickUp();
    const enConstruccion = (await e.cuenta.propietario.post(RUTA, datosDeActivo(e.claseVehiculosId))).cuerpo
      .id as string;

    const futura = await e.cuenta.propietario.post(MEJORAS, mejora(id, { fecha: '2999-01-01' }));
    const antes = await e.cuenta.propietario.post(MEJORAS, mejora(id, { fecha: '2026-09-01' }));
    const sinCostos = await e.cuenta.propietario.post(MEJORAS, mejora(id, { costosManuales: [] }));
    const construccion = await e.cuenta.propietario.post(MEJORAS, mejora(enConstruccion));
    await e.cuenta.propietario.post(MEJORAS, mejora(id));
    const quitar = await e.cuenta.propietario.post(`${RUTA}/${id}/quitar-de-uso`);

    expect(futura.cuerpo.error.codigo).toBe('mejora_invalida');
    expect(antes.cuerpo.error.codigo).toBe('mejora_invalida');
    expect(sinCostos.cuerpo.error.codigo).toBe('costo_invalido');
    expect(construccion.cuerpo.error.codigo).toBe('activo_sin_depreciacion_para_mejorar');
    expect(quitar.cuerpo.error.codigo).toBe('activo_con_mejoras');
  });
});

describe('permisos y aislamiento', () => {
  it('registrar, anular y ver exigen su permiso, y otra cuenta no ve el activo ni la mejora', async () => {
    const id = await pickUp();
    const crea = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Mejoras Crea',
      apellidos: 'Solo',
      permisos: ['activos-fijos.mejoras.crear'],
    });
    const registrada = await crea.post(MEJORAS, mejora(id));
    expect(registrada.estado, JSON.stringify(registrada.cuerpo)).toBe(201);

    const anular = await crea.post(`${MEJORAS}/${registrada.cuerpo.id}/anular`, { motivo: 'x' });
    const ver = await crea.get(`${RUTA}/${id}/mejoras`);
    const revisar = await crea.post(`${RUTA}/${id}/revisar-estimacion`, { vidaUtilRestanteMeses: 10, motivo: 'x' });
    const ajenaRegistra = await ajena.propietario.post(MEJORAS, mejora(id));
    const ajenaAnula = await ajena.propietario.post(`${MEJORAS}/${registrada.cuerpo.id}/anular`, { motivo: 'x' });
    const ajenaLista = await ajena.propietario.get(`${RUTA}/${id}/mejoras`);

    expect([anular.estado, ver.estado, revisar.estado]).toEqual([403, 403, 403]);
    expect([ajenaRegistra.estado, ajenaAnula.estado]).toEqual([404, 404]);
    expect(ajenaLista.estado).toBe(404);
  });
});
