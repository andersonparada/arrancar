/**
 * Traslados con boleta (AF-8): ubicación vigente e historial, boleta numerada con varios activos y componentes, entregar y
 * devolver a la bodega con «ocioso», anular con auditoría, lo que se rechaza, permisos y aislamiento entre cuentas.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import { crearUbicaciones, datosDeActivo } from './soporte/escenario-de-activos.js';
import { prepararBandeja, type EscenarioDeBandeja } from './soporte/escenario-de-bandeja-de-activos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/activos-fijos/activos';
const TRASLADOS = '/api/activos-fijos/traslados';
const entorno = usarEntornoApi();
let e: EscenarioDeBandeja;
let ajena: CuentaDePrueba;
let ubicacion: { localidadId: string; departamentoId: string };

const nuevoActivo = async (cambios: Record<string, unknown> = {}): Promise<string> => {
  const creado = await e.cuenta.propietario.post(
    RUTA,
    datosDeActivo(e.claseVehiculosId, { fechaDeAdquisicion: '2026-09-01', ...cambios }),
  );
  expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
  return creado.cuerpo.id as string;
};

/** Un vehículo de Q250,000.00 puesto en uso el 10 de septiembre de 2026: ya puede ser ocioso. */
async function activoEnUso(): Promise<string> {
  const id = await nuevoActivo({ fechaDeAdquisicion: '2026-09-01' });
  await e.cuenta.propietario.post(`${RUTA}/${id}/costos`, {
    claseDeCosto: 'adquisicion',
    fecha: '2026-09-05',
    monto: '250000.00',
    documentoDeSoporte: 'Escritura 15',
  });
  const puesto = await e.cuenta.propietario.post(`${RUTA}/${id}/poner-en-uso`, { fechaDeInicioDeUso: '2026-09-10' });
  expect(puesto.estado, JSON.stringify(puesto.cuerpo)).toBe(200);
  return id;
}

const traslado = (activoIds: string[], cambios: Record<string, unknown> = {}) => ({
  fecha: '2026-10-05',
  localidadId: ubicacion.localidadId,
  departamentoId: ubicacion.departamentoId,
  responsable: 'Marta López',
  recibidoPor: 'Marta López',
  motivo: 'Entrega para su uso',
  renglones: activoIds.map((activoId) => ({ activoId })),
  ...cambios,
});

const ficha = async (id: string) => (await e.cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo;

beforeAll(async () => {
  instalarDestinoFalso();
  e = await prepararBandeja(entorno, 'aftraslados');
  ubicacion = await crearUbicaciones(e.cuenta);
  ajena = await darDeAltaCuenta(entorno, {
    nombre: 'Traslados ajena',
    usuario: 'propietariotrasladosajeno',
    modulos: ['terceros', 'libro-de-compras', 'activos-fijos'],
  });
});

afterAll(() => vi.restoreAllMocks());

describe('trasladar', () => {
  it('deja la ubicación vigente, suma una fila al historial y devuelve la boleta con los nombres', async () => {
    const id = await nuevoActivo();

    const respuesta = await e.cuenta.propietario.post(TRASLADOS, traslado([id]));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      titulo: 'Responsiva de bienes',
      fecha: '2026-10-05',
      localidadNombre: 'Finca La Esperanza',
      departamentoNombre: 'Taller',
      recibidoPor: 'Marta López',
      estado: 'vigente',
      aBodega: false,
    });
    expect(respuesta.cuerpo.renglones).toHaveLength(1);
    const despues = await ficha(id);
    expect(despues).toMatchObject({ localidadId: ubicacion.localidadId, responsable: 'Marta López', enBodega: false });
    expect(despues.traslados.map((t: { esAlta: boolean }) => t.esAlta)).toEqual([false, true]);
    expect(despues.traslados[0]).toMatchObject({
      grupoId: respuesta.cuerpo.grupoId,
      numero: respuesta.cuerpo.numero,
      anioDeNumero: respuesta.cuerpo.anioDeNumero,
      motivoDeAnulacion: null,
    });
    expect(despues.traslados[1]).toMatchObject({ esAlta: true, grupoId: null, numero: null });
    const imprimible = await e.cuenta.propietario.get(`${TRASLADOS}/${respuesta.cuerpo.grupoId}/boleta`);
    expect(imprimible.cuerpo).toEqual(respuesta.cuerpo);
  });

  it('varios activos comparten boleta; un componente va con su principal; el número sigue', async () => {
    const principal = await nuevoActivo();
    const componente = await nuevoActivo({ activoPadreId: principal });
    const otro = await nuevoActivo();

    const primera = await e.cuenta.propietario.post(TRASLADOS, traslado([principal, otro]));
    const segunda = await e.cuenta.propietario.post(TRASLADOS, traslado([otro], { fecha: '2026-10-06' }));

    expect(primera.cuerpo.renglones).toHaveLength(3);
    const delComponente = primera.cuerpo.renglones.find((r: { activoId: string }) => r.activoId === componente);
    expect(delComponente.componenteDe).toBe((await ficha(principal)).codigo);
    expect((await ficha(componente)).localidadId).toBe(ubicacion.localidadId);
    expect(segunda.cuerpo.numero).toBe(primera.cuerpo.numero + 1);
  });

  it('a la bodega con «marcar ocioso» deja el bien ocioso y en bodega, y queda en la auditoría', async () => {
    const id = await activoEnUso();

    const respuesta = await e.cuenta.propietario.post(
      TRASLADOS,
      traslado([id], { aBodega: true, marcarOcioso: true, responsable: null, motivo: 'Sin uso por la lluvia' }),
    );

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(await ficha(id)).toMatchObject({
      enBodega: true,
      ocioso: true,
      ociosoDesde: '2026-10-05',
      motivoDeOcio: 'Sin uso por la lluvia',
      responsable: null,
    });
    const auditoria = await comoPropietario<{ accion: string }>(
      "select accion from core.auditoria where recurso = 'activos-fijos.activos' and registro_id = $1 and accion = 'corregir'",
      [id],
    );
    expect(auditoria).toHaveLength(1);
  });
});

describe('anular', () => {
  it('devuelve el activo a su ubicación anterior, deja la fila como rastro y queda en la auditoría', async () => {
    const id = await nuevoActivo();
    const boleta = await e.cuenta.propietario.post(TRASLADOS, traslado([id]));

    const anulada = await e.cuenta.propietario.post(`${TRASLADOS}/${boleta.cuerpo.grupoId}/anular`, {
      motivo: 'Se entregó a otra persona',
    });

    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
    expect(anulada.cuerpo).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Se entregó a otra persona' });
    expect(await ficha(id)).toMatchObject({ localidadId: null, responsable: null });
    expect((await ficha(id)).traslados.map((t: { estado: string }) => t.estado)).toEqual(['anulado', 'vigente']);
    const auditoria = await comoPropietario<{ anterior: { numero: number; estado: string } }>(
      "select anterior from core.auditoria where recurso = 'activos-fijos.traslados' and accion = 'anular' and registro_id = $1",
      [boleta.cuerpo.grupoId],
    );
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]!.anterior).toMatchObject({ numero: boleta.cuerpo.numero, estado: 'vigente' });
    const otraVez = await e.cuenta.propietario.post(`${TRASLADOS}/${boleta.cuerpo.grupoId}/anular`, { motivo: 'x' });
    expect(otraVez.cuerpo.error.codigo).toBe('traslado_no_anulable');
  });

  it('solo se anula el último traslado de cada activo', async () => {
    const id = await nuevoActivo();
    const primera = await e.cuenta.propietario.post(TRASLADOS, traslado([id], { fecha: '2026-10-05' }));
    const segunda = await e.cuenta.propietario.post(TRASLADOS, traslado([id], { fecha: '2026-10-10' }));

    const intento = await e.cuenta.propietario.post(`${TRASLADOS}/${primera.cuerpo.grupoId}/anular`, { motivo: 'x' });
    await e.cuenta.propietario.post(`${TRASLADOS}/${segunda.cuerpo.grupoId}/anular`, { motivo: 'x' });
    const ahora = await e.cuenta.propietario.post(`${TRASLADOS}/${primera.cuerpo.grupoId}/anular`, { motivo: 'x' });

    expect(intento.cuerpo.error.codigo).toBe('traslado_no_es_el_ultimo');
    expect(ahora.estado).toBe(200);
  });
});

describe('lo que se rechaza', () => {
  it('fecha futura o anterior al último traslado, componente solo, cantidad parcial y destinos que no existen', async () => {
    const principal = await nuevoActivo();
    const componente = await nuevoActivo({ activoPadreId: principal });
    const id = await nuevoActivo();
    await e.cuenta.propietario.post(TRASLADOS, traslado([id], { fecha: '2026-10-10' }));

    const futura = await e.cuenta.propietario.post(TRASLADOS, traslado([id], { fecha: '2999-01-01' }));
    const anterior = await e.cuenta.propietario.post(TRASLADOS, traslado([id], { fecha: '2026-10-01' }));
    const solo = await e.cuenta.propietario.post(TRASLADOS, traslado([componente]));
    const parcial = await e.cuenta.propietario.post(TRASLADOS, {
      ...traslado([id]),
      renglones: [{ activoId: id, cantidad: 5 }],
    });
    const sinLocalidad = await e.cuenta.propietario.post(
      TRASLADOS,
      traslado([id], { localidadId: crypto.randomUUID(), departamentoId: null }),
    );
    const sinActivo = await e.cuenta.propietario.post(TRASLADOS, traslado([crypto.randomUUID()]));
    const ocioso = await e.cuenta.propietario.post(TRASLADOS, traslado([id], { marcarOcioso: true }));
    const sinReceptor = await e.cuenta.propietario.post(TRASLADOS, traslado([id], { recibidoPor: '' }));

    expect(futura.cuerpo.error.codigo).toBe('traslado_invalido');
    expect(anterior.cuerpo.error.codigo).toBe('fecha_anterior_al_ultimo_traslado');
    expect(solo.cuerpo.error.codigo).toBe('componente_se_traslada_con_su_principal');
    expect(parcial.cuerpo.error.codigo).toBe('traslado_parcial_no_disponible');
    expect([sinLocalidad.estado, sinActivo.estado]).toEqual([404, 404]);
    expect(ocioso.cuerpo.error.codigo).toBe('traslado_invalido');
    expect(sinReceptor.estado).toBe(400);
  });
});

describe('permisos y aislamiento', () => {
  it('trasladar, anular y ver la boleta exigen su permiso, y otra cuenta no ve nada', async () => {
    const id = await nuevoActivo();
    const crea = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Traslados Crea',
      apellidos: 'Solo',
      permisos: ['activos-fijos.traslados.crear'],
    });
    const hecha = await crea.post(TRASLADOS, traslado([id]));
    expect(hecha.estado, JSON.stringify(hecha.cuerpo)).toBe(201);
    const grupoId = hecha.cuerpo.grupoId as string;

    const anular = await crea.post(`${TRASLADOS}/${grupoId}/anular`, { motivo: 'x' });
    const verBoleta = await crea.get(`${TRASLADOS}/${grupoId}/boleta`);
    const ajenaTraslada = await ajena.propietario.post(TRASLADOS, traslado([id]));
    const ajenaAnula = await ajena.propietario.post(`${TRASLADOS}/${grupoId}/anular`, { motivo: 'x' });
    const ajenaVe = await ajena.propietario.get(`${TRASLADOS}/${grupoId}/boleta`);

    expect([anular.estado, verBoleta.estado]).toEqual([403, 403]);
    expect([ajenaTraslada.estado, ajenaAnula.estado, ajenaVe.estado]).toEqual([404, 404, 404]);
  });
});
