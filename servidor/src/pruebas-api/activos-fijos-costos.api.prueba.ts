/**
 * Costos de los activos (AF-3): costos manuales con su soporte (V-8), anular con auditoría, nota de crédito sin dejar el
 * activo en negativo (V-6), avisos del libro al anular o eliminar un documento capitalizado (R-1), eliminar activos con
 * costos, permisos y aislamiento.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { instalarDestinoFalso, RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';
import {
  asignacionNueva,
  capitalizar,
  costosDeActivo,
  prepararBandeja,
  registrarDocumento,
  registrarNotaDeCredito,
  RUTA_ACTIVOS,
  type EscenarioDeBandeja,
} from './soporte/escenario-de-bandeja-de-activos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeBandeja;
let ajena: CuentaDePrueba;

const propietario = () => e.cuenta.propietario;
const manual = (cambios: Record<string, unknown> = {}) => ({
  claseDeCosto: 'importacion',
  fecha: '2026-11-05',
  monto: '2500.00',
  documentoDeSoporte: 'DUCA 26-0000123',
  ...cambios,
});

/** Un documento de Q1,000.00 de costo capitalizado por completo en un activo nuevo. */
async function activoCapitalizado(total = '1120.00', monto = '1000.00') {
  const documento = await registrarDocumento(e, {
    lineas: [{ conceptoId: e.conceptoDeActivoId, total, esActivoFijo: true }],
  });
  const respuesta = await capitalizar(e, [asignacionNueva(e, { lineaId: documento.lineaIds[0]!, monto })]);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return { ...documento, activoId: respuesta.cuerpo.activos[0].id as string };
}

beforeAll(async () => {
  instalarDestinoFalso();
  e = await prepararBandeja(entorno, 'afcostos');
  ajena = await darDeAltaCuenta(entorno, {
    nombre: 'Costos ajena',
    usuario: 'afcostosajena',
    modulos: ['terceros', 'libro-de-compras', 'activos-fijos'],
  });
});

afterAll(() => vi.restoreAllMocks());

describe('costo manual', () => {
  it('suma un costo con su soporte, sin línea del libro', async () => {
    const { activoId } = await activoCapitalizado();

    const respuesta = await propietario().post(`${RUTA_ACTIVOS}/${activoId}/costos`, manual());

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      origen: 'manual',
      claseDeCosto: 'importacion',
      monto: '2500.00',
      documentoDeSoporte: 'DUCA 26-0000123',
      lineaDeDocumentoId: null,
      aplicaAlLibroFiscal: true,
      estado: 'vigente',
    });
    expect((await costosDeActivo(e, activoId)).cuerpo.total).toBe('3500.00');
  });

  it('puede quedar fuera del libro fiscal con su motivo (V-8); sin motivo se rechaza', async () => {
    const { activoId } = await activoCapitalizado();

    const fuera = await propietario().post(
      `${RUTA_ACTIVOS}/${activoId}/costos`,
      manual({ aplicaAlLibroFiscal: false, motivoFueraDelLibroFiscal: 'Costo de desmantelamiento' }),
    );
    const sinMotivo = await propietario().post(
      `${RUTA_ACTIVOS}/${activoId}/costos`,
      manual({ aplicaAlLibroFiscal: false }),
    );

    expect(fuera.cuerpo).toMatchObject({
      aplicaAlLibroFiscal: false,
      motivoFueraDelLibroFiscal: 'Costo de desmantelamiento',
    });
    expect(sinMotivo.estado).toBe(400);
    expect(sinMotivo.cuerpo.error.codigo).toBe('costo_invalido');
  });

  it('exige el soporte, rechaza fechas futuras y «no es edificación» fuera de los edificios', async () => {
    const { activoId } = await activoCapitalizado();
    const pedir = (cambios: Record<string, unknown>) =>
      propietario().post(`${RUTA_ACTIVOS}/${activoId}/costos`, manual(cambios));

    expect((await pedir({ documentoDeSoporte: ' ' })).estado).toBe(400);
    expect((await pedir({ fecha: '2999-01-01' })).cuerpo.error.codigo).toBe('costo_invalido');
    expect((await pedir({ noEsEdificacion: true })).cuerpo.error.codigo).toBe('costo_invalido');
    expect((await pedir({ monto: '0.00' })).estado).toBe(400);
  });

  it('un activo de terceros no lleva costos y uno que no existe es 404', async () => {
    const ajeno = await propietario().post(RUTA_ACTIVOS, {
      codigo: 'TERC-1',
      descripcion: 'Camioneta del vecino',
      claseId: e.claseVehiculosId,
      tipoDeRegistro: 'de_terceros',
      propietario: 'Vecino',
      formaDeTenencia: 'comodato',
      fechaDeAdquisicion: '2026-11-01',
    });

    const deTerceros = await propietario().post(`${RUTA_ACTIVOS}/${ajeno.cuerpo.id}/costos`, manual());
    const inexistente = await propietario().post(`${RUTA_ACTIVOS}/${crypto.randomUUID()}/costos`, manual());

    expect(deTerceros.cuerpo.error.codigo).toBe('activo_de_terceros_sin_costos');
    expect(inexistente.estado).toBe(404);
  });
});

describe('anular un costo', () => {
  it('queda anulado con su motivo, el total baja y la auditoría guarda cómo estaba', async () => {
    const { activoId } = await activoCapitalizado();
    const costo = (await propietario().post(`${RUTA_ACTIVOS}/${activoId}/costos`, manual())).cuerpo;

    const anulado = await propietario().post(`/api/activos-fijos/costos/${costo.id}/anular`, {
      motivo: 'Se capturó dos veces',
    });
    const repetido = await propietario().post(`/api/activos-fijos/costos/${costo.id}/anular`, { motivo: 'Otra vez' });

    expect(anulado.estado).toBe(200);
    expect(anulado.cuerpo).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Se capturó dos veces' });
    expect(repetido.cuerpo.error.codigo).toBe('costo_no_anulable');
    const lista = (await costosDeActivo(e, activoId)).cuerpo;
    expect(lista.total).toBe('1000.00');
    expect(lista.costos.map((c: { estado: string }) => c.estado)).toEqual(['anulado', 'vigente']);
    const auditado = await comoPropietario<{ motivo: string; anterior: { monto: string; estado: string } }>(
      "select motivo, anterior from core.auditoria where recurso = 'activos-fijos.costos' and accion = 'anular' and registro_id = $1",
      [costo.id],
    );
    expect(auditado).toHaveLength(1);
    expect(auditado[0]).toMatchObject({
      motivo: 'Se capturó dos veces',
      anterior: { monto: '2500.00', estado: 'vigente' },
    });
  });

  it('anular un costo de línea libera su pendiente en la bandeja', async () => {
    const { activoId, lineaIds } = await activoCapitalizado();
    const [costo] = (await costosDeActivo(e, activoId)).cuerpo.costos;

    await propietario().post(`/api/activos-fijos/costos/${costo.id}/anular`, {
      motivo: 'Capitalicé el activo equivocado',
    });

    const otra = await capitalizar(e, [
      asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '1000.00', descripcion: 'El correcto' }),
    ]);
    expect(otra.estado).toBe(201);
  });

  it('no deja el costo del activo negativo (V-6): la nota de crédito se capitaliza mientras alcance', async () => {
    const factura = await registrarDocumento(e);
    const { cuerpo } = await capitalizar(e, [asignacionNueva(e, { lineaId: factura.lineaIds[0]!, monto: '400.00' })]);
    const activoId = cuerpo.activos[0].id as string;
    const nota = await registrarNotaDeCredito(e, factura.documentoId, '560.00');

    const demasiado = await capitalizar(e, [{ lineaId: nota.lineaIds[0], monto: '-500.00', activoId }]);
    const alcanza = await capitalizar(e, [{ lineaId: nota.lineaIds[0], monto: '-400.00', activoId }]);
    const positivo = await capitalizar(e, [{ lineaId: nota.lineaIds[0], monto: '100.00', activoId }]);

    expect(demasiado.cuerpo.error.codigo).toBe('costo_de_activo_negativo');
    expect(alcanza.estado).toBe(201);
    expect(positivo.cuerpo.error.codigo).toBe('monto_de_costo_invalido');
    const lista = (await costosDeActivo(e, activoId)).cuerpo;
    expect(lista.total).toBe('0.00');
    expect(lista.costos.map((c: { claseDeCosto: string; monto: string }) => [c.claseDeCosto, c.monto])).toEqual([
      ['adquisicion', '400.00'],
      ['nota_de_credito', '-400.00'],
    ]);
  });
});

describe('avisos del libro: documentos con costos capitalizados (R-1)', () => {
  it('no se anula ni se elimina un documento con costos vigentes; el error lista los activos', async () => {
    const { documentoId } = await activoCapitalizado();

    const anular = await propietario().post(`${RUTA_DOCUMENTOS}/${documentoId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Error',
    });
    const eliminar = await propietario().delete(`${RUTA_DOCUMENTOS}/${documentoId}`);

    for (const respuesta of [anular, eliminar]) {
      expect(respuesta.estado).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('documento_con_costos_capitalizados');
      expect(respuesta.cuerpo.error.detalles.activos).toHaveLength(1);
    }
    const [documento] = await comoPropietario<{ estado: string }>(
      'select estado from libro_de_compras.documentos where id = $1',
      [documentoId],
    );
    expect(documento!.estado).toBe('vigente');
  });

  it('anulados sus costos, el documento se anula; y eliminarlo lo frena la llave, con un mensaje claro', async () => {
    const anulable = await activoCapitalizado();
    const protegido = await activoCapitalizado();
    for (const { activoId } of [anulable, protegido]) {
      const [costo] = (await costosDeActivo(e, activoId)).cuerpo.costos;
      await propietario().post(`/api/activos-fijos/costos/${costo.id}/anular`, { motivo: 'Liberar el documento' });
    }

    const anulado = await propietario().post(`${RUTA_DOCUMENTOS}/${anulable.documentoId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Error',
    });
    const eliminado = await propietario().delete(`${RUTA_DOCUMENTOS}/${protegido.documentoId}`);

    expect(anulado.estado).toBe(200);
    expect(eliminado.estado).toBe(409);
    expect(eliminado.cuerpo.error.mensaje).toContain('costos capitalizados en Activos fijos');
  });
});

describe('eliminar un activo con costos', () => {
  it('con costos vigentes de líneas del libro no se elimina: se anulan primero', async () => {
    const { activoId } = await activoCapitalizado();

    const respuesta = await propietario().delete(`${RUTA_ACTIVOS}/${activoId}`);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('activo_con_movimientos');
  });

  it('con sus costos de línea anulados o solo manuales se elimina y la auditoría guarda su costo', async () => {
    const { activoId } = await activoCapitalizado();
    const [costo] = (await costosDeActivo(e, activoId)).cuerpo.costos;
    await propietario().post(`/api/activos-fijos/costos/${costo.id}/anular`, { motivo: 'Error' });
    await propietario().post(`${RUTA_ACTIVOS}/${activoId}/costos`, manual());

    const respuesta = await propietario().delete(`${RUTA_ACTIVOS}/${activoId}`);

    expect(respuesta.estado).toBe(204);
    const filas = await comoPropietario('select 1 from activos_fijos.costos where activo_id = $1', [activoId]);
    expect(filas).toHaveLength(0);
    const [auditado] = await comoPropietario<{ anterior: { costo: string; costos: { estado: string }[] } }>(
      "select anterior from core.auditoria where recurso = 'activos-fijos.activos' and accion = 'eliminar' and registro_id = $1",
      [activoId],
    );
    expect(auditado!.anterior.costo).toBe('2500.00');
    expect(auditado!.anterior.costos.map((c) => c.estado).sort()).toEqual(['anulado', 'vigente']);
  });
});

describe('permisos y aislamiento', () => {
  it('cada acción exige su permiso', async () => {
    const { activoId } = await activoCapitalizado();
    const [costo] = (await costosDeActivo(e, activoId)).cuerpo.costos;
    const soloVer = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Costos Ve',
      apellidos: 'Solo',
      permisos: ['activos-fijos.activos.ver'],
    });
    const crea = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Costos Crea',
      apellidos: 'Solo',
      permisos: ['activos-fijos.costos.crear'],
    });

    expect((await soloVer.get(`${RUTA_ACTIVOS}/${activoId}/costos`)).estado).toBe(200);
    expect((await soloVer.post(`${RUTA_ACTIVOS}/${activoId}/costos`, manual())).estado).toBe(403);
    expect((await crea.post(`${RUTA_ACTIVOS}/${activoId}/costos`, manual())).estado).toBe(201);
    expect((await crea.get(`${RUTA_ACTIVOS}/${activoId}/costos`)).estado).toBe(403);
    expect((await crea.post(`/api/activos-fijos/costos/${costo.id}/anular`, { motivo: 'x' })).estado).toBe(403);
  });

  it('otra cuenta no ve ni toca los costos de este activo', async () => {
    const { activoId } = await activoCapitalizado();
    const [costo] = (await costosDeActivo(e, activoId)).cuerpo.costos;

    const lista = await ajena.propietario.get(`${RUTA_ACTIVOS}/${activoId}/costos`);
    const nuevo = await ajena.propietario.post(`${RUTA_ACTIVOS}/${activoId}/costos`, manual());
    const anular = await ajena.propietario.post(`/api/activos-fijos/costos/${costo.id}/anular`, { motivo: 'x' });

    expect([lista.estado, nuevo.estado, anular.estado]).toEqual([404, 404, 404]);
  });
});
