/**
 * Poner en uso y quitar de uso (AF-4): parámetros propuestos por la clase y su máximo de ley, los dos tramos de
 * depreciación en la ficha, fechas, terrenos, quitar de uso con auditoría, eliminar un activo con tramos, permisos y
 * aislamiento.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { claseDe, datosDeActivo } from './soporte/escenario-de-activos.js';

const RUTA = '/api/activos-fijos/activos';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let ajena: CuentaDePrueba;
let vehiculosId: string;
let edificiosId: string;
let terrenosId: string;

const costoManual = (monto: string, cambios: Record<string, unknown> = {}) => ({
  claseDeCosto: 'adquisicion',
  fecha: '2026-11-05',
  monto,
  documentoDeSoporte: 'Escritura 15',
  ...cambios,
});

/** Un activo en construcción de la clase, con un costo manual de `monto` si se da. */
async function activoConCosto(claseId: string, monto: string | null, cambios: Record<string, unknown> = {}) {
  const creado = await cuenta.propietario.post(RUTA, datosDeActivo(claseId, cambios));
  expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
  const id = creado.cuerpo.id as string;
  if (monto) expect((await cuenta.propietario.post(`${RUTA}/${id}/costos`, costoManual(monto))).estado).toBe(201);
  return id;
}

const poner = (id: string, cuerpo: Record<string, unknown> = {}) =>
  cuenta.propietario.post(`${RUTA}/${id}/poner-en-uso`, { fechaDeInicioDeUso: '2026-11-10', ...cuerpo });

const auditoria = (accion: string, registroId: string) =>
  comoPropietario<{ anterior: { estado: string; tramos: unknown[] } }>(
    "select anterior from core.auditoria where recurso = 'activos-fijos.activos' and accion = $1 and registro_id = $2",
    [accion, registroId],
  );

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Uso', usuario: 'propietariouso', modulos });
  ajena = await darDeAltaCuenta(entorno, { nombre: 'Uso ajena', usuario: 'propietariousoajeno', modulos });
  vehiculosId = await claseDe(cuenta, 'Vehículos');
  edificiosId = await claseDe(cuenta, 'Edificios');
  terrenosId = await claseDe(cuenta, 'Terrenos');
});

describe('poner en uso', () => {
  it('propone de la clase, pasa a en uso y la ficha trae los dos tramos', async () => {
    const id = await activoConCosto(vehiculosId, '250000.00');

    const respuesta = await poner(id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({
      estado: 'en_uso',
      fechaDeInicioDeUso: '2026-11-10',
      porcentajeFiscal: '20.00',
      vidaUtilContableMeses: 60,
      valorResidual: '0.00',
    });
    const [contable, fiscal] = respuesta.cuerpo.tramos;
    expect(contable).toMatchObject({
      libro: 'contable',
      desdePeriodo: '2026-11-01',
      causa: 'inicio_de_uso',
      porDepreciar: '250000.00',
      meses: 60,
      cuotaMensual: '4166.67',
      excesoDeNotaDeCredito: '0.00',
    });
    expect(fiscal).toMatchObject({
      libro: 'fiscal',
      porcentaje: '20.00',
      baseDelPorcentaje: '250000.00',
      cuotaMensual: '4166.67',
    });
    const ficha = await cuenta.propietario.get(`${RUTA}/${id}`);
    expect(ficha.cuerpo.tramos).toHaveLength(2);
  });

  it('acepta los parámetros escritos y rechaza un porcentaje sobre el máximo de ley', async () => {
    const id = await activoConCosto(vehiculosId, '12000.00');

    const alto = await poner(id, { porcentajeFiscal: '21.00' });
    const bueno = await poner(id, { porcentajeFiscal: '15.00', vidaUtilContableMeses: 48, valorResidual: '2000.00' });

    expect(alto.estado).toBe(400);
    expect(alto.cuerpo.error.codigo).toBe('parametros_de_uso_invalidos');
    expect(bueno.cuerpo).toMatchObject({
      porcentajeFiscal: '15.00',
      vidaUtilContableMeses: 48,
      valorResidual: '2000.00',
    });
    expect(bueno.cuerpo.tramos[0]).toMatchObject({ porDepreciar: '10000.00', cuotaMensual: '208.33' });
  });

  it('el edificio con matrícula y catastro deprecia con el tope del inmueble', async () => {
    const id = await activoConCosto(edificiosId, null, {
      valorDeMatricula: '1000000.00',
      valorCatastral: '1200000.00',
      valoresDelInmuebleCompleto: true,
    });
    await cuenta.propietario.post(`${RUTA}/${id}/costos`, costoManual('1500000.00'));
    await cuenta.propietario.post(`${RUTA}/${id}/costos`, costoManual('100000.00', { noEsEdificacion: true }));

    const respuesta = await poner(id);

    const [contable, fiscal] = respuesta.cuerpo.tramos;
    expect(contable.porDepreciar).toBe('1600000.00');
    expect(fiscal).toMatchObject({
      porDepreciar: '940000.00',
      baseDelPorcentaje: '940000.00',
      cuotaMensual: '3916.67',
    });
  });

  it('exige costo y fecha válida; un terreno se pone en uso sin tramos', async () => {
    const sinCosto = await activoConCosto(vehiculosId, null);
    const conCosto = await activoConCosto(vehiculosId, '1000.00');
    const terreno = await activoConCosto(terrenosId, null);

    const rechazo = await poner(sinCosto);
    const antes = await poner(conCosto, { fechaDeInicioDeUso: '2026-10-01' });
    const deTerreno = await poner(terreno);

    expect(rechazo.cuerpo.error.codigo).toBe('activo_sin_costo');
    expect(antes.cuerpo.error.codigo).toBe('fecha_de_uso_invalida');
    expect(deTerreno.cuerpo).toMatchObject({ estado: 'en_uso', porcentajeFiscal: '0.00', tramos: [] });
  });

  it('solo se pone en uso un activo en construcción y el costo posterior ya no se admite', async () => {
    const id = await activoConCosto(vehiculosId, '1000.00');
    await poner(id);

    const otraVez = await poner(id);
    const costo = await cuenta.propietario.post(`${RUTA}/${id}/costos`, costoManual('10.00'));

    expect(otraVez.estado).toBe(422);
    expect(otraVez.cuerpo.error.codigo).toBe('activo_no_en_construccion');
    expect(costo.estado).toBe(422);
  });
});

describe('quitar de uso', () => {
  it('lo devuelve a construcción, borra los tramos y deja la auditoría con cómo estaba', async () => {
    const id = await activoConCosto(vehiculosId, '1000.00');
    await poner(id);

    const respuesta = await cuenta.propietario.post(`${RUTA}/${id}/quitar-de-uso`);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({
      estado: 'en_construccion',
      fechaDeInicioDeUso: null,
      tramos: [],
      porcentajeFiscal: null,
    });
    const filas = await auditoria('devolver', id);
    expect(filas).toHaveLength(1);
    expect(filas[0]!.anterior).toMatchObject({ estado: 'en_uso' });
    expect(filas[0]!.anterior.tramos).toHaveLength(2);
    const otra = await cuenta.propietario.post(`${RUTA}/${id}/quitar-de-uso`);
    expect(otra.cuerpo.error.codigo).toBe('activo_sin_libros');
  });

  it('un activo en uso sin movimientos se elimina junto con sus tramos', async () => {
    const id = await activoConCosto(vehiculosId, '1000.00');
    await poner(id);

    const eliminado = await cuenta.propietario.delete(`${RUTA}/${id}`);

    expect(eliminado.estado).toBe(204);
    const restantes = await comoPropietario('select 1 from activos_fijos.tramos where activo_id = $1', [id]);
    expect(restantes).toHaveLength(0);
    const filas = await auditoria('eliminar', id);
    expect(filas[0]!.anterior.tramos).toHaveLength(2);
  });
});

describe('permisos y aislamiento', () => {
  it('poner y quitar de uso exigen su permiso', async () => {
    const id = await activoConCosto(vehiculosId, '1000.00');
    const edita = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Uso Edita',
      apellidos: 'Solo',
      permisos: ['activos-fijos.activos.editar'],
    });
    const pone = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Uso Pone',
      apellidos: 'Solo',
      permisos: ['activos-fijos.activos.poner-en-uso'],
    });

    expect((await edita.post(`${RUTA}/${id}/poner-en-uso`, { fechaDeInicioDeUso: '2026-11-10' })).estado).toBe(403);
    expect((await pone.post(`${RUTA}/${id}/poner-en-uso`, { fechaDeInicioDeUso: '2026-11-10' })).estado).toBe(200);
    expect((await edita.post(`${RUTA}/${id}/quitar-de-uso`)).estado).toBe(403);
    expect((await pone.post(`${RUTA}/${id}/quitar-de-uso`)).estado).toBe(200);
  });

  it('otra cuenta no puede poner en uso ni quitar de uso este activo', async () => {
    const id = await activoConCosto(vehiculosId, '1000.00');

    const poner = await ajena.propietario.post(`${RUTA}/${id}/poner-en-uso`, { fechaDeInicioDeUso: '2026-11-10' });
    const quitar = await ajena.propietario.post(`${RUTA}/${id}/quitar-de-uso`);

    expect([poner.estado, quitar.estado]).toEqual([404, 404]);
  });
});
