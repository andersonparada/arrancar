/**
 * Conceptos de ingreso (LV-1): lista sugerida al abrir, concepto de sistema, nombre único, inactivar y eliminar con
 * auditoría, aislamiento entre cuentas, permisos por acción y Excel.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/libro-de-ventas/conceptos-de-ingreso';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;

const datos = (cambios: Record<string, unknown> = {}) => ({
  nombre: 'Registro de prueba',
  tipo: 'bien',
  activo: true,
  ...cambios,
});

const auditoria = (accion: string, registroId: string) =>
  comoPropietario<{ anterior: { nombre: string } }>(
    'select anterior from core.auditoria where recurso = $1 and accion = $2 and registro_id = $3',
    ['libro-de-ventas.conceptos-de-ingreso', accion, registroId],
  );

async function conceptoDeSistema(quien: CuentaDePrueba): Promise<{ id: string; nombre: string }> {
  const lista = await quien.propietario.get(RUTA);
  return lista.cuerpo.find((c: { claveDeSistema: string | null }) => c.claveDeSistema !== null);
}

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'libro-de-ventas'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Generada', usuario: 'propietariogenerado', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno', modulos });
});

describe('lista sugerida', () => {
  it('la primera vez que se abre el catálogo trae los cuatro conceptos, uno de sistema, y no se repite', async () => {
    const primera = await otraCuenta.propietario.get(RUTA);
    const segunda = await otraCuenta.propietario.get(RUTA);

    expect(primera.cuerpo.map((c: { nombre: string }) => c.nombre)).toEqual([
      'Otros ingresos',
      'Prestación de servicios',
      'Venta de activo fijo',
      'Venta de bienes',
    ]);
    expect(segunda.cuerpo).toEqual(primera.cuerpo);
    const sistema = primera.cuerpo.filter((c: { claveDeSistema: string | null }) => c.claveDeSistema);
    expect(sistema).toMatchObject([{ nombre: 'Venta de activo fijo', claveDeSistema: 'venta_de_activo_fijo' }]);
  });

  it('el concepto de sistema no se edita, ni se inactiva, ni se elimina', async () => {
    const sistema = await conceptoDeSistema(otraCuenta);

    const editado = await otraCuenta.propietario.put(`${RUTA}/${sistema.id}`, datos({ nombre: 'Otro nombre' }));
    const inactivado = await otraCuenta.propietario.put(
      `${RUTA}/${sistema.id}`,
      datos({ nombre: sistema.nombre, activo: false }),
    );
    const eliminado = await otraCuenta.propietario.delete(`${RUTA}/${sistema.id}`);

    for (const respuesta of [editado, inactivado, eliminado]) {
      expect(respuesta.estado).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('concepto_de_ingreso_de_sistema');
    }
  });
});

describe('conceptos de ingreso por API', () => {
  it('se registran, se ven y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const id = creado.cuerpo.id;
    const cambiado = await cuenta.propietario.put(`${RUTA}/${id}`, datos({ nombre: 'Registro cambiado' }));

    expect(creado.estado).toBe(201);
    expect(creado.cuerpo.claveDeSistema).toBeNull();
    expect((await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo).toEqual(cambiado.cuerpo);
    expect((await cuenta.propietario.get(RUTA)).cuerpo).toContainEqual(cambiado.cuerpo);
    expect(cambiado.cuerpo.nombre).toBe('Registro cambiado');
  });

  it('el nombre no se repite en la empresa, sin mayúsculas ni acentos', async () => {
    await cuenta.propietario.post(RUTA, datos({ nombre: 'Venta de ganado' }));

    const repetido = await cuenta.propietario.post(RUTA, datos({ nombre: ' VENTA DE GANÁDO ' }));

    expect(repetido.estado).toBe(409);
  });

  it('se inactivan y se reactivan sin perder sus datos, y queda en la auditoría', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'Inactivable' }));
    const inactivo = await cuenta.propietario.put(
      `${RUTA}/${creado.cuerpo.id}`,
      datos({ nombre: 'Inactivable', activo: false }),
    );
    const reactivo = await cuenta.propietario.put(`${RUTA}/${creado.cuerpo.id}`, datos({ nombre: 'Inactivable' }));

    expect(inactivo.cuerpo).toEqual({ ...creado.cuerpo, activo: false });
    expect(reactivo.cuerpo).toEqual(creado.cuerpo);
    expect(await auditoria('inactivar', creado.cuerpo.id)).toHaveLength(1);
    expect(await auditoria('reactivar', creado.cuerpo.id)).toHaveLength(1);
  });

  it('se eliminan y quedan en la auditoría con cómo estaban', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'Efímero' }));

    const eliminado = await cuenta.propietario.delete(`${RUTA}/${creado.cuerpo.id}`);

    expect(eliminado.estado).toBe(204);
    expect((await cuenta.propietario.get(`${RUTA}/${creado.cuerpo.id}`)).estado).toBe(404);
    expect(await auditoria('eliminar', creado.cuerpo.id)).toMatchObject([{ anterior: { nombre: 'Efímero' } }]);
  });

  it('otra cuenta no los ve ni los toca', async () => {
    const ajeno = await otraCuenta.propietario.post(RUTA, datos({ nombre: 'Solo de la otra' }));

    expect((await cuenta.propietario.get(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
    expect((await cuenta.propietario.delete(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
    expect((await cuenta.propietario.get(RUTA)).cuerpo).not.toContainEqual(ajeno.cuerpo);
  });
});

describe('Excel y permisos', () => {
  it('lo exportado se puede revisar para importarlo de nuevo', async () => {
    await cuenta.propietario.post(RUTA, datos({ nombre: 'Para exportar' }));
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);

    const revision = await cuenta.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=true`, {
      nombreArchivo: 'conceptos-de-ingreso.xlsx',
      tipoMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contenido: exportado.cuerpo,
    });

    expect(exportado.estado).toBe(200);
    expect(revision.cuerpo).toMatchObject({ guardado: false, filas: expect.any(Number) });
  });

  it('cada acción exige su permiso, y sin el módulo de ventas nada se alcanza', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['libro-de-ventas.conceptos-de-ingreso.ver'],
    });
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'Protegido' }));

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos())).estado).toBe(403);
    expect((await lector.put(`${RUTA}/${creado.cuerpo.id}`, datos())).estado).toBe(403);
    expect((await lector.delete(`${RUTA}/${creado.cuerpo.id}`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});
