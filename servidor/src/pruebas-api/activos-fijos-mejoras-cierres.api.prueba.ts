/**
 * Mejoras, revisión de la estimación y cambio de matrícula (AF-7) frente a los cierres mensuales: nunca tocan un mes
 * cerrado, una mejora que un cierre usó no se anula hasta reabrir el mes, y cada cambio queda en la auditoría.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { claseDe, datosDeActivo } from './soporte/escenario-de-activos.js';

const RUTA = '/api/activos-fijos/activos';
const MEJORAS = '/api/activos-fijos/mejoras';
const DEPRECIACION = '/api/activos-fijos/depreciacion';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let vehiculo: string;
let edificio: string;

/** Un activo de la clase con su costo, puesto en uso el 10 de septiembre de 2026. */
async function activoEnUso(claseId: string, monto: string): Promise<string> {
  const creado = await cuenta.propietario.post(RUTA, datosDeActivo(claseId, { fechaDeAdquisicion: '2026-09-01' }));
  const id = creado.cuerpo.id as string;
  const costo = { claseDeCosto: 'adquisicion', fecha: '2026-09-05', monto, documentoDeSoporte: 'Escritura 15' };
  await cuenta.propietario.post(`${RUTA}/${id}/costos`, costo);
  const puesto = await cuenta.propietario.post(`${RUTA}/${id}/poner-en-uso`, { fechaDeInicioDeUso: '2026-09-10' });
  expect(puesto.estado, JSON.stringify(puesto.cuerpo)).toBe(200);
  return id;
}

const cerrar = (periodo: string) => cuenta.propietario.post(`${DEPRECIACION}/${periodo}/cerrar`, {});
const tramos = async (id: string) =>
  (await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo.tramos as Array<Record<string, string | number | null>>;
const auditoria = (id: string, accion: string) =>
  comoPropietario<{ anterior: { tramos: unknown[] }; motivo: string | null }>(
    "select anterior, motivo from core.auditoria where recurso = 'activos-fijos.activos' and accion = $1 and registro_id = $2",
    [accion, id],
  );

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Mejoras cierres', usuario: 'propietariomejorascierres', modulos });
  vehiculo = await activoEnUso(await claseDe(cuenta, 'Vehículos'), '250000.00');
  edificio = await activoEnUso(await claseDe(cuenta, 'Edificios'), '1000000.00');
  for (const periodo of ['2026-09-01', '2026-10-01']) {
    const cierre = await cerrar(periodo);
    expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);
  }
});

describe('con septiembre y octubre cerrados', () => {
  it('revisar la estimación abre un tramo contable desde noviembre y deja la auditoría con cómo estaba', async () => {
    const respuesta = await cuenta.propietario.post(`${RUTA}/${vehiculo}/revisar-estimacion`, {
      vidaUtilRestanteMeses: 90,
      valorResidual: '10000.00',
      motivo: 'El tractor aguanta más de lo estimado',
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    const revision = (await tramos(vehiculo)).find((tramo) => tramo.causa === 'revision_de_estimacion');
    expect(revision).toMatchObject({
      libro: 'contable',
      desdePeriodo: '2026-11-01',
      meses: 90,
      valorResidual: '10000.00',
    });
    expect(revision!.porDepreciar).toBe('231666.66');
    expect(respuesta.cuerpo).toMatchObject({ vidaUtilContableMeses: 92, valorResidual: '10000.00' });
    const filas = await auditoria(vehiculo, 'corregir');
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ motivo: 'El tractor aguanta más de lo estimado' });
    expect(filas[0]!.anterior.tramos).toHaveLength(2);
  });

  it('el porcentaje fiscal no se cambia después del primer cierre (arts. 27 y 28)', async () => {
    const respuesta = await cuenta.propietario.post(`${RUTA}/${vehiculo}/revisar-estimacion`, {
      vidaUtilRestanteMeses: 90,
      porcentajeFiscal: '15.00',
      motivo: 'Quiero otra tasa',
    });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('porcentaje_fiscal_adoptado');
  });

  it('el cambio de matrícula abre un tramo fiscal con la base topada y solo vale para los edificios', async () => {
    const solicitud = {
      valorDeMatricula: '600000.00',
      valoresDelInmuebleCompleto: false,
      motivo: 'Nuevo avalúo',
      documentoDeSoporte: 'Avalúo 12-2026',
    };

    const respuesta = await cuenta.propietario.post(`${RUTA}/${edificio}/valor-fiscal-del-inmueble`, solicitud);
    const deVehiculo = await cuenta.propietario.post(`${RUTA}/${vehiculo}/valor-fiscal-del-inmueble`, solicitud);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ valorDeMatricula: '600000.00' });
    const nuevo = (await tramos(edificio)).find((tramo) => tramo.causa === 'cambio_de_matricula');
    expect(nuevo).toMatchObject({
      libro: 'fiscal',
      desdePeriodo: '2026-11-01',
      baseDelPorcentaje: '600000.00',
      cuotaMensual: '2500.00',
    });
    expect((await tramos(edificio)).filter((tramo) => tramo.libro === 'contable')).toHaveLength(1);
    expect(deVehiculo.cuerpo.error.codigo).toBe('valor_fiscal_solo_en_edificios');
    const filas = await auditoria(edificio, 'corregir');
    expect(filas[0]!.motivo).toBe('Nuevo avalúo (soporte: Avalúo 12-2026)');
  });

  it('una mejora no puede fecharse en un mes cerrado', async () => {
    const respuesta = await cuenta.propietario.post(MEJORAS, {
      activoId: vehiculo,
      clase: 'mejora',
      fecha: '2026-10-20',
      descripcion: 'Motor nuevo',
      costosManuales: [{ claseDeCosto: 'otro', monto: '1000.00', documentoDeSoporte: 'Factura 1' }],
    });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('mes_cerrado');
  });
});

describe('una mejora y el cierre de noviembre', () => {
  it('sustituye el tramo de la revisión; si un cierre la usó no se anula hasta reabrir, y anularla repone la revisión', async () => {
    const registrada = await cuenta.propietario.post(MEJORAS, {
      activoId: vehiculo,
      clase: 'mejora',
      fecha: '2026-11-10',
      descripcion: 'Motor nuevo',
      costosManuales: [{ claseDeCosto: 'otro', monto: '50000.00', documentoDeSoporte: 'Factura 55' }],
    });
    expect(registrada.estado, JSON.stringify(registrada.cuerpo)).toBe(201);
    expect((await tramos(vehiculo)).map((t) => t.causa)).toEqual([
      'inicio_de_uso',
      'inicio_de_uso',
      'mejora',
      'mejora',
    ]);
    const cierre = await cerrar('2026-11-01');
    expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);

    const bloqueada = await cuenta.propietario.post(`${MEJORAS}/${registrada.cuerpo.id}/anular`, { motivo: 'Error' });
    const reabierto = await cuenta.propietario.post(`${DEPRECIACION}/2026-11-01/reabrir`, { motivo: 'Falta un costo' });
    const anulada = await cuenta.propietario.post(`${MEJORAS}/${registrada.cuerpo.id}/anular`, { motivo: 'Error' });

    expect(bloqueada.cuerpo.error.codigo).toBe('mejora_con_libros_usados');
    expect(reabierto.estado, JSON.stringify(reabierto.cuerpo)).toBe(200);
    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
    const causas = (await tramos(vehiculo)).map((t) => `${t.libro}:${t.causa}`);
    expect(causas).toEqual(['contable:inicio_de_uso', 'fiscal:inicio_de_uso', 'contable:revision_de_estimacion']);
  });

  it('los permisos de la revisión y del cambio de matrícula son propios', async () => {
    const edita = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Revisa Edita',
      apellidos: 'Solo',
      permisos: ['activos-fijos.activos.editar'],
    });
    const revisa = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Revisa Revisa',
      apellidos: 'Solo',
      permisos: ['activos-fijos.activos.revisar-estimacion'],
    });
    const cuerpo = { vidaUtilRestanteMeses: 80, motivo: 'Prueba de permisos' };

    expect((await edita.post(`${RUTA}/${vehiculo}/revisar-estimacion`, cuerpo)).estado).toBe(403);
    expect((await revisa.post(`${RUTA}/${vehiculo}/revisar-estimacion`, cuerpo)).estado).toBe(200);
  });
});
