/**
 * Acta y denuncia de las bajas (AF-9, V-12): subir, reemplazar, abrir con cabeceras seguras, auditoría `adjuntar`, baja
 * anulada, otra cuenta y los permisos de bajas.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { claseDe } from './soporte/escenario-de-activos.js';
import { activoEnUsoDe, baja } from './soporte/escenario-de-bajas-de-activos.js';
import { instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearImagenPng } from './soporte/imagenes.js';

const BAJAS = '/api/activos-fijos/bajas';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let ajena: CuentaDePrueba;
let vehiculosId: string;

const activoEnUso = (monto?: string, cambios?: Record<string, unknown>) =>
  activoEnUsoDe(cuenta, vehiculosId, { monto, cambios });

const auditoria = (accion: string, registroId: string) =>
  comoPropietario<{ anterior: Record<string, unknown>; motivo: string | null }>(
    "select anterior, motivo from core.auditoria where recurso = 'activos-fijos.bajas' and accion = $1 and registro_id = $2 order by creado_en",
    [accion, registroId],
  );

const rutaDelActa = (bajaId: string, tipo = 'administrativa') => `${BAJAS}/${bajaId}/acta?tipoDeActa=${tipo}`;

beforeAll(async () => {
  instalarDestinoFalso();
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Bajas docs', usuario: 'propietariobajasdocs', modulos });
  ajena = await darDeAltaCuenta(entorno, { nombre: 'Bajas docs ajena', usuario: 'propietariobajasdocsajeno', modulos });
  vehiculosId = await claseDe(cuenta, 'Vehículos');
});

afterAll(() => vi.restoreAllMocks());

describe('acta y denuncia', () => {
  it('sube el acta con su tipo, la sirve con cabeceras seguras y quita el aviso; el archivo no sale por /archivos', async () => {
    const id = await activoEnUso();
    const creada = (await cuenta.propietario.post(BAJAS, baja(id, { causa: 'robo' }))).cuerpo;

    const subida = await cuenta.propietario.subirImagen(
      'POST',
      rutaDelActa(creada.id, 'notarial'),
      await crearImagenPng(80, 60),
    );

    expect(subida.estado, JSON.stringify(subida.cuerpo)).toBe(200);
    expect(subida.cuerpo).toMatchObject({ tieneActa: true, tipoDeActa: 'notarial' });
    expect(subida.cuerpo.avisos.map((a: { codigo: string }) => a.codigo)).toEqual(['sin_denuncia']);
    const abierta = await cuenta.propietario.get(`${BAJAS}/${creada.id}/acta`);
    expect(abierta.estado).toBe(200);
    expect(abierta.cabeceras['content-disposition']).toBe('inline; filename="acta-de-baja.webp"');
    expect(abierta.cabeceras['cache-control']).toBe('private, no-store');
    expect(abierta.cabeceras['x-content-type-options']).toBe('nosniff');
    const [archivo] = await comoPropietario<{ id: string }>(
      "select id from core.archivos where recurso_dueno = 'activos-fijos.bajas' order by creado_en desc limit 1",
      [],
    );
    expect((await cuenta.propietario.get(`/api/archivos/${archivo!.id}`)).estado).toBe(404);
  });

  it('reemplazar el acta borra el anterior y audita adjuntar; sin tipo de acta o sin archivo se rechaza', async () => {
    const id = await activoEnUso();
    const creada = (await cuenta.propietario.post(BAJAS, baja(id))).cuerpo;
    await cuenta.propietario.subirImagen('POST', rutaDelActa(creada.id), await crearImagenPng(50, 50));
    const [primero] = await comoPropietario<{ acta_archivo_id: string }>(
      'select acta_archivo_id from activos_fijos.bajas where id = $1',
      [creada.id],
    );

    const otra = await cuenta.propietario.subirImagen(
      'POST',
      rutaDelActa(creada.id, 'notarial'),
      await crearImagenPng(70, 70),
    );
    const sinTipo = await cuenta.propietario.subirImagen('POST', `${BAJAS}/${creada.id}/acta`, await crearImagenPng());
    const sinArchivo = await cuenta.propietario.enviarCrudo(
      rutaDelActa(creada.id, 'notarial'),
      Buffer.from('--x--\r\n'),
      'multipart/form-data; boundary=x',
    );

    expect(otra.cuerpo.tipoDeActa).toBe('notarial');
    expect([sinTipo.estado, sinArchivo.estado]).toEqual([400, 400]);
    expect(await comoPropietario('select 1 from core.archivos where id = $1', [primero!.acta_archivo_id])).toHaveLength(
      0,
    );
    const filas = await auditoria('adjuntar', creada.id);
    expect(filas.map((fila) => fila.anterior)).toEqual([
      { documento: 'acta', habiaArchivo: false, tipoDeActa: null },
      { documento: 'acta', habiaArchivo: true, tipoDeActa: 'administrativa' },
    ]);
  });

  it('un archivo que no es PDF ni foto responde 400 y no deja archivo ni auditoría', async () => {
    const id = await activoEnUso();
    const creada = (await cuenta.propietario.post(BAJAS, baja(id))).cuerpo;
    const texto = { nombreArchivo: 'a.pdf', tipoMime: 'application/pdf', contenido: Buffer.from('no soy un pdf') };

    const respuesta = await cuenta.propietario.subirImagen('POST', rutaDelActa(creada.id), texto);

    expect(respuesta.estado).toBe(400);
    expect(await auditoria('adjuntar', creada.id)).toHaveLength(0);
    expect(
      await comoPropietario('select 1 from activos_fijos.bajas where id = $1 and acta_archivo_id is not null', [
        creada.id,
      ]),
    ).toHaveLength(0);
  });

  it('la denuncia se sube y se abre; sin ella o sin acta, abrir responde 404', async () => {
    const id = await activoEnUso();
    const creada = (await cuenta.propietario.post(BAJAS, baja(id, { causa: 'extravio' }))).cuerpo;
    const sin = await cuenta.propietario.get(`${BAJAS}/${creada.id}/denuncia`);

    const subida = await cuenta.propietario.subirImagen(
      'POST',
      `${BAJAS}/${creada.id}/denuncia`,
      await crearImagenPng(),
    );

    expect([sin.estado, sin.cuerpo.error.codigo]).toEqual([404, 'documento_de_baja_inexistente']);
    expect(subida.cuerpo).toMatchObject({ tieneDenuncia: true });
    expect((await cuenta.propietario.get(`${BAJAS}/${creada.id}/denuncia`)).estado).toBe(200);
    expect((await cuenta.propietario.get(`${BAJAS}/${creada.id}/acta`)).estado).toBe(404);
  });

  it('una baja anulada no admite documentos pero sigue mostrando los que tenía; otra cuenta no los sube ni los abre', async () => {
    const id = await activoEnUso();
    const creada = (await cuenta.propietario.post(BAJAS, baja(id))).cuerpo;
    await cuenta.propietario.subirImagen('POST', rutaDelActa(creada.id), await crearImagenPng());
    const ajenaSube = await ajena.propietario.subirImagen(
      'POST',
      rutaDelActa(creada.id, 'notarial'),
      await crearImagenPng(),
    );
    const ajenaAbre = await ajena.propietario.get(`${BAJAS}/${creada.id}/acta`);
    await cuenta.propietario.post(`${BAJAS}/${creada.id}/anular`, { motivo: 'Error' });

    const tarde = await cuenta.propietario.subirImagen(
      'POST',
      rutaDelActa(creada.id, 'notarial'),
      await crearImagenPng(),
    );

    expect([ajenaSube.estado, ajenaAbre.estado]).toEqual([404, 404]);
    expect([tarde.estado, tarde.cuerpo.error.codigo]).toEqual([422, 'baja_anulada']);
    expect((await cuenta.propietario.get(`${BAJAS}/${creada.id}/acta`)).estado).toBe(200);
  });
});

describe('permisos', () => {
  it('dar de baja exige bajas.crear, anular exige bajas.anular y ver exige activos.ver', async () => {
    const id = await activoEnUso();
    const crea = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Baja Crea',
      apellidos: 'Solo',
      permisos: ['activos-fijos.bajas.crear'],
    });
    const anula = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Baja Anula',
      apellidos: 'Solo',
      permisos: ['activos-fijos.bajas.anular'],
    });
    const ve = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Baja Ve',
      apellidos: 'Solo',
      permisos: ['activos-fijos.activos.ver'],
    });

    const veCrea = await ve.post(BAJAS, baja(id));
    const creada = await crea.post(BAJAS, baja(id));
    const creaAnula = await crea.post(`${BAJAS}/${creada.cuerpo.id}/anular`, { motivo: 'X' });
    const creaVe = await crea.get(`${BAJAS}/${creada.cuerpo.id}`);
    const veLee = await ve.get(`${BAJAS}/${creada.cuerpo.id}`);
    const veSube = await ve.subirImagen('POST', rutaDelActa(creada.cuerpo.id), await crearImagenPng());
    const anulaAnula = await anula.post(`${BAJAS}/${creada.cuerpo.id}/anular`, { motivo: 'Corrección' });

    expect(veCrea.estado).toBe(403);
    expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
    expect([creaAnula.estado, creaVe.estado, veLee.estado, veSube.estado, anulaAnula.estado]).toEqual([
      403, 403, 200, 403, 200,
    ]);
  });

  it('otra cuenta no puede dar de baja un activo ajeno', async () => {
    const id = await activoEnUso();

    const respuesta = await ajena.propietario.post(BAJAS, baja(id));

    expect(respuesta.estado).toBe(404);
  });
});
