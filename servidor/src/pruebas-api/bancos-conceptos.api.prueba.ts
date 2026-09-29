import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/bancos/conceptos';
const CONCEPTOS_DE_SISTEMA = 4;
const CONCEPTOS_SUGERIDOS = 19;
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;

const datos = (cambios: Record<string, unknown> = {}) => ({
  nombre: 'Registro de prueba',
  aplicaA: 'credito',
  actividadDeFlujo: 'operacion',
  grupoDeFlujo: 'Registro de prueba',
  esCargoBancario: false,
  pideDatosDeIntereses: false,
  admiteFactura: false,
  activo: true,
  ...cambios,
});

const listar = async (quien: CuentaDePrueba) => (await quien.propietario.get(RUTA)).cuerpo as Array<any>;

beforeAll(async () => {
  const modulos = ['bancos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Generada', usuario: 'propietariogenerado', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno', modulos });
});

describe('conceptos por API', () => {
  it('la empresa nueva recibe la semilla al abrir el catálogo, una sola vez', async () => {
    const primera = await listar(cuenta);
    const segunda = await listar(cuenta);

    expect(primera).toHaveLength(CONCEPTOS_DE_SISTEMA + CONCEPTOS_SUGERIDOS);
    expect(
      primera
        .filter((c) => c.claveDeSistema)
        .map((c) => c.claveDeSistema)
        .sort(),
    ).toEqual(['pago_a_proveedor', 'saldo_inicial', 'sin_clasificar', 'transferencia']);
    expect(primera.every((c) => c.admiteFactura === false)).toBe(true);
    expect(segunda).toEqual(primera);
  });

  it('se registran y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const id = creado.cuerpo.id;
    const cambiado = await cuenta.propietario.put(`${RUTA}/${id}`, datos({ nombre: 'Registro cambiado' }));

    expect(creado.estado).toBe(201);
    expect(creado.cuerpo.claveDeSistema).toBeNull();
    expect((await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo).toEqual(cambiado.cuerpo);
    expect((await listar(cuenta)).find((c) => c.id === id)).toEqual(cambiado.cuerpo);
  });

  it('no repite el nombre dentro de la empresa', async () => {
    await cuenta.propietario.post(RUTA, datos({ nombre: 'Nombre repetido' }));
    const repetido = await cuenta.propietario.post(RUTA, datos({ nombre: 'Nombre repetido' }));

    expect(repetido.estado).toBe(409);
    expect(repetido.cuerpo.error.mensaje).toBe('Ya existe un concepto con ese nombre.');
  });

  it('se inactivan sin perder sus datos y la baja queda en la auditoría', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'Para inactivar' }));
    const inactivo = await cuenta.propietario.put(
      `${RUTA}/${creado.cuerpo.id}`,
      datos({ nombre: 'Para inactivar', activo: false }),
    );

    expect(inactivo.cuerpo).toEqual({ ...creado.cuerpo, activo: false });
  });

  it('los de sistema no se editan, inactivan ni eliminan', async () => {
    const transferencia = (await listar(cuenta)).find((c) => c.claveDeSistema === 'transferencia');

    const editado = await cuenta.propietario.put(`${RUTA}/${transferencia.id}`, datos({ nombre: 'Otro nombre' }));
    const inactivado = await cuenta.propietario.put(`${RUTA}/${transferencia.id}`, { ...transferencia, activo: false });
    const eliminado = await cuenta.propietario.delete(`${RUTA}/${transferencia.id}`, { motivo: 'prueba' });

    expect([editado.estado, inactivado.estado, eliminado.estado]).toEqual([422, 422, 422]);
    expect(editado.cuerpo.error.codigo).toBe('concepto_de_sistema');
  });

  it('elimina uno que nadie usa, con su motivo, y deja el rastro', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'Para eliminar' }));
    const sinMotivo = await cuenta.propietario.delete(`${RUTA}/${creado.cuerpo.id}`, {});
    const eliminado = await cuenta.propietario.delete(`${RUTA}/${creado.cuerpo.id}`, { motivo: 'Duplicado' });

    expect(sinMotivo.estado).toBe(400);
    expect(eliminado.estado).toBe(204);
    expect((await cuenta.propietario.get(`${RUTA}/${creado.cuerpo.id}`)).estado).toBe(404);
  });

  it('los datos de intereses no se piden en una nota de débito', async () => {
    const invalido = await cuenta.propietario.post(
      RUTA,
      datos({ nombre: 'Intereses mal', aplicaA: 'debito', pideDatosDeIntereses: true }),
    );

    expect(invalido.estado).toBe(400);
  });

  it('otra cuenta no los ve', async () => {
    const ajeno = await otraCuenta.propietario.post(RUTA, datos({ nombre: 'Solo de la otra' }));

    expect((await cuenta.propietario.get(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
    expect((await listar(cuenta)).some((c) => c.id === ajeno.cuerpo.id)).toBe(false);
  });

  it('lo exportado se puede revisar para importarlo de nuevo', async () => {
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);

    const revision = await cuenta.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=true`, {
      nombreArchivo: 'conceptos.xlsx',
      tipoMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contenido: exportado.cuerpo,
    });

    expect(exportado.estado).toBe(200);
    expect(revision.cuerpo).toMatchObject({ guardado: false, filas: expect.any(Number) });
  });

  it('para registrar hace falta el permiso de crear', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['bancos.conceptos.ver'],
    });

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos({ nombre: 'Sin permiso' }))).estado).toBe(403);
    expect((await lector.delete(`${RUTA}/${randomId()}`, { motivo: 'x' })).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});

function randomId(): string {
  return crypto.randomUUID();
}
