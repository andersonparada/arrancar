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

function crearCliente(nit: string, cambios: { puedeCrearClientes?: boolean } = {}) {
  return mediador.enviar(operador, 'terceros.crear_cliente_desde_dte', {
    nit,
    tipoDePersona: 'juridica',
    nombres: null,
    apellidos: null,
    razonSocial: 'Compradora del Norte, S.A.',
    puedeCrearClientes: true,
    ...cambios,
  });
}

/** La orden devuelve `null` solo con el consumidor final: aquí se espera siempre un cliente. */
async function crearClienteExistente(nit: string) {
  return (await enTransaccion(() => crearCliente(nit)))!;
}

function enTransaccion<T>(accion: () => Promise<T>): Promise<T> {
  return unidadDeTrabajo.ejecutar(operador, accion);
}

async function fichaDe(terceroId: string) {
  return (await cuenta.propietario.get(`/api/terceros/${terceroId}`)).cuerpo;
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Ventas', usuario: 'propietarioventas', modulos: ['terceros'] });
  operador = {
    empresaId: cuenta.empresaId,
    cuentaId: cuenta.cuentaId,
    usuarioId: await idDelSoporte(),
    esSuperacceso: true,
  };
});

describe('orden terceros.crear_cliente_desde_dte por el mediador', () => {
  it('crea el tercero con su papel de cliente (clase directo) y repetir el NIT no lo duplica', async () => {
    const primera = await crearClienteExistente(NIT);
    const segunda = await crearClienteExistente(' 576937-k ');

    expect(primera).toMatchObject({ creado: true, nombre: 'Compradora del Norte, S.A.' });
    expect(segunda).toEqual({ ...primera, creado: false });
    const ficha = await fichaDe(primera.terceroId);
    expect(ficha).toMatchObject({ nit: NIT, razonSocial: 'Compradora del Norte, S.A.', tipo: 'juridica' });
    expect(ficha.cliente).toMatchObject({ id: primera.clienteId, clase: 'directo', activo: true });
    expect(ficha.proveedor).toBeNull();
  });

  it('a un tercero existente sin el papel de cliente se lo asigna sin duplicarlo', async () => {
    const tercero = await cuenta.propietario.post('/api/terceros', {
      tipo: 'juridica',
      razonSocial: 'Solo proveedor',
      nit: '11111119',
      papel: { tipo: 'proveedor' },
    });

    const respuesta = await crearClienteExistente('11111119');

    expect(respuesta).toMatchObject({ terceroId: tercero.cuerpo.id, creado: false });
    const ficha = await fichaDe(tercero.cuerpo.id);
    expect(ficha.cliente).toMatchObject({ id: respuesta.clienteId, activo: true });
    expect(ficha.proveedor).not.toBeNull();
    expect(ficha.razonSocial).toBe('Solo proveedor');
  });

  it('el consumidor final (CF) no crea nada y responde null', async () => {
    const respuesta = await enTransaccion(() => crearCliente('CF'));
    const sinPermiso = await enTransaccion(() => crearCliente('cf', { puedeCrearClientes: false }));

    expect(respuesta).toBeNull();
    expect(sinPermiso).toBeNull();
    const listado = await cuenta.propietario.get('/api/terceros?texto=CF');
    expect(listado.cuerpo).toEqual([]);
  });

  it('un rechazo de quien manda deshace el tercero y el papel creados', async () => {
    const operacion = enTransaccion(async () => {
      await transaccionEnCurso().insert(correlativos).values({ empresaId: operador.empresaId, clave: 'antes-dte' });
      await crearCliente('22222227');
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

  it('un cliente inactivo se rechaza con cliente_inactivo y no se toca', async () => {
    const creado = await crearClienteExistente('33333335');
    await cuenta.propietario.delete(`/api/terceros/${creado.terceroId}/cliente`);

    const operacion = enTransaccion(() => crearCliente('33333335'));

    await expect(operacion).rejects.toMatchObject({ codigo: 'cliente_inactivo' });
    expect((await fichaDe(creado.terceroId)).cliente.activo).toBe(false);
  });

  it('sin el permiso de crear clientes responde sin_permiso (403) y no crea nada', async () => {
    const operacion = enTransaccion(() => crearCliente('44444443', { puedeCrearClientes: false }));

    await expect(operacion).rejects.toMatchObject({ codigo: 'sin_permiso', detalles: { accion: 'crear' } });
    const listado = await cuenta.propietario.get('/api/terceros?texto=44444443');
    expect(listado.cuerpo).toEqual([]);
  });
});
