/**
 * Clases de activos (AF-1): lista sugerida al abrir, topes de ley, terrenos, nombre único, inactivar y eliminar con
 * auditoría, aislamiento entre cuentas y permisos por acción.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/activos-fijos/clases';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;

const datos = (cambios: Record<string, unknown> = {}) => ({
  nombre: 'Registro de prueba',
  incisoFiscal: 'edificios',
  porcentajeFiscal: '5.00',
  vidaUtilContableMeses: 240,
  valorResidualPorcentaje: '10.00',
  activo: true,
  ...cambios,
});

const auditoria = (recurso: string, accion: string, registroId: string) =>
  comoPropietario<{ anterior: { nombre: string } }>(
    'select anterior from core.auditoria where recurso = $1 and accion = $2 and registro_id = $3',
    [recurso, accion, registroId],
  );

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Generada', usuario: 'propietariogenerado', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno', modulos });
});

describe('lista sugerida', () => {
  it('la primera vez que se abre el catálogo trae las 14 clases con los porcentajes del art. 28, y no se repite', async () => {
    const primera = await otraCuenta.propietario.get(RUTA);
    const segunda = await otraCuenta.propietario.get(RUTA);

    expect(primera.cuerpo).toHaveLength(14);
    expect(segunda.cuerpo).toEqual(primera.cuerpo);
    const porNombre = new Map(primera.cuerpo.map((c: { nombre: string }) => [c.nombre, c]));
    expect(porNombre.get('Equipo de cómputo')).toMatchObject({ incisoFiscal: 'computo', porcentajeFiscal: '33.33' });
    expect(porNombre.get('Terrenos')).toMatchObject({ incisoFiscal: 'terrenos', porcentajeFiscal: '0.00' });
    expect(porNombre.get('Programas y licencias')).toMatchObject({ incisoFiscal: 'intangibles' });
  });
});

describe('clases de activos por API', () => {
  it('se registran, se ven y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const id = creado.cuerpo.id;
    const cambiado = await cuenta.propietario.put(`${RUTA}/${id}`, datos({ nombre: 'Registro cambiado' }));

    expect(creado.estado).toBe(201);
    expect(creado.cuerpo).toMatchObject({ porcentajeFiscal: '5.00', vidaUtilContableMeses: 240 });
    expect((await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo).toEqual(cambiado.cuerpo);
    expect((await cuenta.propietario.get(RUTA)).cuerpo).toContainEqual(cambiado.cuerpo);
  });

  it('el porcentaje no pasa del máximo del inciso, ni al crear ni al editar', async () => {
    const sobre = await cuenta.propietario.post(RUTA, datos({ nombre: 'Sobre', porcentajeFiscal: '5.01' }));
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'En el tope', porcentajeFiscal: '5' }));
    const editado = await cuenta.propietario.put(
      `${RUTA}/${creado.cuerpo.id}`,
      datos({ nombre: 'En el tope', porcentajeFiscal: '6' }),
    );

    expect(sobre.estado).toBe(400);
    expect(sobre.cuerpo.error.codigo).toBe('clase_con_porcentaje_sobre_el_maximo');
    expect(sobre.cuerpo.error.detalles).toEqual({ maximo: 5 });
    expect(creado.estado).toBe(201);
    expect(editado.cuerpo.error.codigo).toBe('clase_con_porcentaje_sobre_el_maximo');
  });

  it('los terrenos van en 0 % y sin vida útil; los demás incisos, con porcentaje', async () => {
    const terreno = datos({
      nombre: 'Lotes',
      incisoFiscal: 'terrenos',
      porcentajeFiscal: '0',
      vidaUtilContableMeses: null,
    });
    const conPorcentaje = datos({ nombre: 'Lotes 2', incisoFiscal: 'terrenos', porcentajeFiscal: '5' });
    const sinPorcentaje = datos({ nombre: 'Casas', porcentajeFiscal: '0' });

    expect((await cuenta.propietario.post(RUTA, terreno)).estado).toBe(201);
    expect((await cuenta.propietario.post(RUTA, conPorcentaje)).estado).toBe(400);
    expect((await cuenta.propietario.post(RUTA, sinPorcentaje)).estado).toBe(400);
  });

  it('la vida útil y el valor residual tienen sus límites', async () => {
    const vida = await cuenta.propietario.post(RUTA, datos({ nombre: 'V', vidaUtilContableMeses: 1201 }));
    const residual = await cuenta.propietario.post(RUTA, datos({ nombre: 'R', valorResidualPorcentaje: '100' }));

    expect(vida.estado).toBe(400);
    expect(residual.estado).toBe(400);
  });

  it('el nombre no se repite aunque cambien mayúsculas, acentos o espacios', async () => {
    const primero = await cuenta.propietario.post(RUTA, datos({ nombre: 'Única' }));
    const repetido = await cuenta.propietario.post(RUTA, datos({ nombre: '  UNICA ' }));

    expect(primero.estado).toBe(201);
    expect(repetido.estado).toBe(409);
  });

  it('inactivar y reactivar dejan su auditoría y no pierden los datos', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'Para inactivar' }));
    const id = creado.cuerpo.id;
    const inactivo = await cuenta.propietario.put(`${RUTA}/${id}`, datos({ nombre: 'Para inactivar', activo: false }));
    await cuenta.propietario.put(`${RUTA}/${id}`, datos({ nombre: 'Para inactivar', activo: true }));

    expect(inactivo.cuerpo).toEqual({ ...creado.cuerpo, activo: false });
    expect(await auditoria('activos-fijos.clases', 'inactivar', id)).toHaveLength(1);
    expect(await auditoria('activos-fijos.clases', 'reactivar', id)).toHaveLength(1);
  });

  it('otra cuenta no las ve', async () => {
    const ajeno = await otraCuenta.propietario.post(RUTA, datos({ nombre: 'Ajena' }));

    expect((await cuenta.propietario.get(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
    expect((await cuenta.propietario.put(`${RUTA}/${ajeno.cuerpo.id}`, datos())).estado).toBe(404);
    expect((await cuenta.propietario.delete(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
  });
});

describe('eliminar', () => {
  it('elimina una clase sin nada ligado y queda en la auditoría', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'Para eliminar' }));

    const eliminado = await cuenta.propietario.delete(`${RUTA}/${creado.cuerpo.id}`);

    expect(eliminado.estado).toBe(204);
    expect((await cuenta.propietario.get(`${RUTA}/${creado.cuerpo.id}`)).estado).toBe(404);
    const filas = await auditoria('activos-fijos.clases', 'eliminar', creado.cuerpo.id);
    expect(filas).toHaveLength(1);
    expect(filas[0]!.anterior.nombre).toBe('Para eliminar');
  });
});

describe('permisos por acción', () => {
  it('cada acción exige su permiso', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'Para permisos' }));
    const id = creado.cuerpo.id;
    const con = (nombres: string, accion: string) =>
      crearUsuarioConPermisos(entorno, cuenta, {
        nombres,
        apellidos: 'Clases',
        permisos: ['activos-fijos.clases.ver', `activos-fijos.clases.${accion}`],
      });
    const soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['activos-fijos.clases.ver'],
    });
    const editor = await con('Editor', 'editar');
    const eliminador = await con('Eliminador', 'eliminar');

    expect((await soloVer.get(RUTA)).estado).toBe(200);
    expect((await soloVer.post(RUTA, datos({ nombre: 'X' }))).estado).toBe(403);
    expect((await soloVer.put(`${RUTA}/${id}`, datos())).estado).toBe(403);
    expect((await soloVer.delete(`${RUTA}/${id}`)).estado).toBe(403);
    expect((await editor.put(`${RUTA}/${id}`, datos({ nombre: 'Para permisos' }))).estado).toBe(200);
    expect((await editor.delete(`${RUTA}/${id}`)).estado).toBe(403);
    expect((await eliminador.put(`${RUTA}/${id}`, datos())).estado).toBe(403);
    expect((await eliminador.delete(`${RUTA}/${id}`)).estado).toBe(204);
  });

  it('el módulo apagado cierra las rutas', async () => {
    const sinModulo = await darDeAltaCuenta(entorno, {
      nombre: 'Sin activos',
      usuario: 'propietariosinactivos',
      modulos: [],
    });

    expect((await sinModulo.propietario.get(RUTA)).estado).toBe(403);
  });
});
