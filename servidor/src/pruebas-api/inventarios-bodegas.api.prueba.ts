import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/inventarios/bodegas';
const SIN_ID = '00000000-0000-4000-8000-000000000000';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
let n = 0;

const datos = (cambios: Record<string, unknown> = {}) => {
  n += 1;
  return {
    codigo: `bod-${n}`,
    nombre: `Bodega ${n}`,
    localidadId: null,
    responsable: 'Pedro',
    responsableUsuarioId: null,
    activo: true,
    ...cambios,
  };
};

const rastro = (accion: string, bodegaId: string) =>
  comoPropietario<{ anterior: Record<string, unknown> }>(
    `select anterior from core.auditoria where recurso = 'inventarios.bodegas' and accion = $1 and registro_id = $2`,
    [accion, bodegaId],
  );

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'inventarios'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Bodegas', usuario: 'propietariobodegas', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietariobodegasajena', modulos });
});

describe('bodegas por API', () => {
  it('se registran con el código en mayúsculas, se listan y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ codigo: 'abc-1' }));
    const id = creado.cuerpo.id;
    const cambiado = await cuenta.propietario.put(`${RUTA}/${id}`, datos({ codigo: 'abc-2' }));

    expect(creado.estado).toBe(201);
    expect(creado.cuerpo.codigo).toBe('ABC-1');
    expect((await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo).toEqual(cambiado.cuerpo);
    expect(cambiado.cuerpo.codigo).toBe('ABC-2');
  });

  it('rechaza un código de forma inválida y los repetidos (código o nombre sin importar mayúsculas)', async () => {
    const base = await cuenta.propietario.post(RUTA, datos({ codigo: 'UNICA', nombre: 'Bodega Única' }));

    const invalido = await cuenta.propietario.post(RUTA, datos({ codigo: 'con espacios' }));
    const mismoCodigo = await cuenta.propietario.post(RUTA, datos({ codigo: 'unica' }));
    const mismoNombre = await cuenta.propietario.post(RUTA, datos({ nombre: 'BODEGA ÚNICA' }));

    expect(base.estado).toBe(201);
    expect([invalido.estado, mismoCodigo.estado, mismoNombre.estado]).toEqual([400, 409, 409]);
  });

  it('se inactivan sin perder sus datos y queda en la auditoría', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const inactivo = await cuenta.propietario.put(
      `${RUTA}/${creado.cuerpo.id}`,
      datos({ ...creado.cuerpo, activo: false }),
    );

    expect(inactivo.cuerpo).toEqual({ ...creado.cuerpo, activo: false });
    expect(await rastro('inactivar', creado.cuerpo.id)).toHaveLength(1);
  });

  it('se eliminan con su rastro en la auditoría y con los usuarios que tenían acceso', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());

    const borrado = await cuenta.propietario.delete(`${RUTA}/${creado.cuerpo.id}`);

    expect(borrado.estado).toBe(204);
    expect((await cuenta.propietario.get(`${RUTA}/${creado.cuerpo.id}`)).estado).toBe(404);
    const [entrada] = await rastro('eliminar', creado.cuerpo.id);
    expect(entrada?.anterior).toMatchObject({ codigo: creado.cuerpo.codigo, usuariosConAcceso: [expect.anything()] });
  });

  it('la localidad y el responsable deben existir en la empresa', async () => {
    const localidadAjena = await otraCuenta.propietario.post('/api/empresas/localidades', {
      codigo: 'AJE-1',
      nombre: 'Localidad ajena',
      tipoId: (
        (await otraCuenta.propietario.get('/api/empresas/tipos-de-localidad')).cuerpo as Array<{ id: string }>
      )[0]!.id,
      codigoEstablecimientoSat: null,
      nombreComercialSat: null,
      departamentoCodigo: null,
      municipioCodigo: null,
      direccion: null,
      activo: true,
    });

    const sinLocalidad = await cuenta.propietario.post(RUTA, datos({ localidadId: SIN_ID }));
    const ajena = await cuenta.propietario.post(RUTA, datos({ localidadId: localidadAjena.cuerpo.id }));
    const sinUsuario = await cuenta.propietario.post(RUTA, datos({ responsableUsuarioId: SIN_ID }));
    const usuarioAjeno = await cuenta.propietario.post(
      RUTA,
      datos({ responsableUsuarioId: (await otraCuenta.propietario.get('/api/sesion')).cuerpo.usuario.id }),
    );

    expect([sinLocalidad.estado, ajena.estado, sinUsuario.estado, usuarioAjeno.estado]).toEqual([404, 404, 404, 404]);
  });

  it('otra cuenta no las ve', async () => {
    const ajeno = await otraCuenta.propietario.post(RUTA, datos());

    expect((await cuenta.propietario.get(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
    expect((await otraCuenta.propietario.get(RUTA)).cuerpo).toEqual(expect.arrayContaining([ajeno.cuerpo]));
  });

  it('lo exportado se puede revisar para importarlo de nuevo', async () => {
    await cuenta.propietario.post(RUTA, datos());
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);

    const revision = await cuenta.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=true`, {
      nombreArchivo: 'bodegas.xlsx',
      tipoMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contenido: exportado.cuerpo,
    });

    expect(exportado.estado).toBe(200);
    expect(revision.cuerpo).toMatchObject({ guardado: false, filas: expect.any(Number) });
  });

  it('cada acción exige su propio permiso', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['inventarios.bodegas.ver'],
    });
    const propia = (await cuenta.propietario.post(RUTA, datos())).cuerpo.id;

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos())).estado).toBe(403);
    expect((await lector.put(`${RUTA}/${propia}`, datos())).estado).toBe(403);
    expect((await lector.delete(`${RUTA}/${propia}`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});
