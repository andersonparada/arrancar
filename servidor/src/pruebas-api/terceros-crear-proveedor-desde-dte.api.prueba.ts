import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { bd } from '../modulos/core/base-datos/conexion.js';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import { correlativos } from '../modulos/core/compartido/infraestructura/persistencia/correlativos.tablas.js';
import {
  transaccionEnCurso,
  UnidadDeTrabajoPostgres,
} from '../modulos/core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import '../modulos/core/contratos/terceros.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const unidadDeTrabajo = new UnidadDeTrabajoPostgres(bd);
const NIT = '576937K';
let cuenta: CuentaDePrueba;
let operador: Operador;

class RechazoDelDestino extends Error {}

async function idDelSoporte(): Promise<string> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  const { rows } = await conexion.query<{ id: string }>('select id from core.usuarios where es_superacceso');
  await conexion.end();
  return rows[0]!.id;
}

function crearProveedor(nit: string, cambios: { puedeCrearProveedores?: boolean } = {}) {
  return mediador.enviar(operador, 'terceros.crear_proveedor_desde_dte', {
    nit,
    nombre: 'Agro del Norte, S.A.',
    tipoDePersona: 'juridica',
    puedeCrearProveedores: true,
    ...cambios,
  });
}

function enTransaccion<T>(accion: () => Promise<T>): Promise<T> {
  return unidadDeTrabajo.ejecutar(operador, accion);
}

async function fichaDe(terceroId: string) {
  return (await cuenta.propietario.get(`/api/terceros/${terceroId}`)).cuerpo;
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Compras', usuario: 'propietariodte', modulos: ['terceros'] });
  operador = {
    empresaId: cuenta.empresaId,
    cuentaId: cuenta.cuentaId,
    usuarioId: await idDelSoporte(),
    esSuperacceso: true,
  };
});

describe('orden terceros.crear_proveedor_desde_dte por el mediador', () => {
  it('crea el tercero con su papel de proveedor y repetir el NIT no lo duplica', async () => {
    const primera = await enTransaccion(() => crearProveedor(NIT));
    const segunda = await enTransaccion(() => crearProveedor(' 576937-k '));

    expect(primera.creado).toBe(true);
    expect(segunda).toEqual({ ...primera, creado: false });
    const ficha = await fichaDe(primera.terceroId);
    expect(ficha).toMatchObject({ nit: NIT, razonSocial: 'Agro del Norte, S.A.', tipo: 'juridica' });
    expect(ficha.proveedor).toMatchObject({ id: primera.proveedorId, activo: true });
  });

  it('a un tercero existente sin el papel de proveedor se lo asigna sin duplicarlo', async () => {
    const tercero = await cuenta.propietario.post('/api/terceros', {
      tipo: 'juridica',
      razonSocial: 'Solo cliente',
      nit: '11111119',
    });

    const respuesta = await enTransaccion(() => crearProveedor('11111119'));

    expect(respuesta).toMatchObject({ terceroId: tercero.cuerpo.id, creado: false });
    const ficha = await fichaDe(tercero.cuerpo.id);
    expect(ficha.proveedor).toMatchObject({ id: respuesta.proveedorId, activo: true });
    expect(ficha.razonSocial).toBe('Solo cliente');
  });

  it('un rechazo de quien manda deshace el tercero y el papel creados', async () => {
    const operacion = enTransaccion(async () => {
      await transaccionEnCurso().insert(correlativos).values({ empresaId: operador.empresaId, clave: 'antes-dte' });
      await crearProveedor('22222227');
      throw new RechazoDelDestino();
    });

    await expect(operacion).rejects.toThrow(RechazoDelDestino);
    const listado = await cuenta.propietario.get('/api/terceros?texto=22222227');
    expect(listado.cuerpo).toEqual([]);
    const guardados = await enTransaccion(() =>
      transaccionEnCurso().select({ clave: correlativos.clave }).from(correlativos),
    );
    expect(guardados.map((fila) => fila.clave)).not.toContain('antes-dte');
  });

  it('un proveedor inactivo se rechaza y no se toca', async () => {
    const creado = await enTransaccion(() => crearProveedor('33333335'));
    await cuenta.propietario.delete(`/api/terceros/${creado.terceroId}/proveedor`);

    const operacion = enTransaccion(() => crearProveedor('33333335'));

    await expect(operacion).rejects.toMatchObject({ codigo: 'proveedor_inactivo' });
    expect((await fichaDe(creado.terceroId)).proveedor.activo).toBe(false);
  });

  it('sin el permiso de crear proveedores responde sin_permiso (403) y no crea nada', async () => {
    const operacion = enTransaccion(() => crearProveedor('44444443', { puedeCrearProveedores: false }));

    await expect(operacion).rejects.toMatchObject({ codigo: 'sin_permiso' });
    const listado = await cuenta.propietario.get('/api/terceros?texto=44444443');
    expect(listado.cuerpo).toEqual([]);
  });
});
