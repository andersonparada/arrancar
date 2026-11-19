import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { SeccionInvalida } from '../modulos/core/compartido/aplicacion/errores-de-seccion.js';
import '../modulos/core/contratos/terceros.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

/**
 * El aviso `terceros.cliente_guardado` (VC-0a) con un escucha falso, como el de proveedores en
 * `secciones-aportadas.api.prueba.ts`; y la llave compuesta `clientes_id_cuenta_unico` entre cuentas.
 */
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
const recibidas: Array<{ clienteId: string; terceroId: string; secciones: unknown }> = [];

const seccionMala = { prueba: { malo: true } };
const seccionBuena = { prueba: { malo: false } };

beforeAll(async () => {
  mediador.escuchar('terceros', 'terceros.cliente_guardado', async ({ clienteId, terceroId, secciones }) => {
    recibidas.push({ clienteId, terceroId, secciones });
    const propia = secciones.prueba as { malo?: boolean } | undefined;
    if (propia?.malo) throw new SeccionInvalida([{ campo: 'secciones.prueba.malo', mensaje: 'La sección es mala.' }]);
  });
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Clientes',
    usuario: 'propietarioclientes',
    modulos: ['terceros'],
  });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Otra', usuario: 'propietariootra', modulos: ['terceros'] });
});

async function clienteIdDe(terceroId: string): Promise<string> {
  return (await cuenta.propietario.get(`/api/terceros/${terceroId}`)).cuerpo.cliente.id;
}

const cliente = (nombres: string, secciones: unknown) => ({
  tipo: 'individual',
  nombres,
  papel: { tipo: 'cliente', clase: 'directo' },
  secciones,
});

describe('secciones en el formulario de Clientes', () => {
  it('registrar con una sección buena avisa con ella y el id del cliente, y guarda al cliente', async () => {
    const respuesta = await cuenta.propietario.post('/api/terceros', cliente('Buena', seccionBuena));

    expect(respuesta.estado).toBe(201);
    expect(recibidas.at(-1)).toMatchObject({
      clienteId: await clienteIdDe(respuesta.cuerpo.id),
      terceroId: respuesta.cuerpo.id,
      secciones: seccionBuena,
    });
  });

  it('una sección inválida devuelve el error por campo con su prefijo y no guarda al tercero', async () => {
    const respuesta = await cuenta.propietario.post('/api/terceros', cliente('Mala', seccionMala));
    const guardados = await cuenta.propietario.get('/api/terceros?texto=Mala');

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.detalles).toEqual([
      { campo: 'secciones.prueba.malo', mensaje: 'La sección es mala.' },
    ]);
    expect(guardados.cuerpo).toEqual([]);
  });

  it('asignar el papel de cliente con una sección inválida no lo asigna; con una buena, sí', async () => {
    const tercero = await cuenta.propietario.post('/api/terceros', { tipo: 'individual', nombres: 'Sin papel' });
    const ruta = `/api/terceros/${tercero.cuerpo.id}/cliente`;

    const rechazada = await cuenta.propietario.put(ruta, { clase: 'directo', secciones: seccionMala });
    const aceptada = await cuenta.propietario.put(ruta, { clase: 'directo', secciones: seccionBuena });
    const ficha = await cuenta.propietario.get(`/api/terceros/${tercero.cuerpo.id}`);

    expect(rechazada.estado).toBe(400);
    expect(aceptada.estado).toBe(200);
    expect(ficha.cuerpo.cliente).not.toBeNull();
    expect(recibidas.at(-1)).toMatchObject({ clienteId: aceptada.cuerpo.id, secciones: seccionBuena });
  });

  it('sin secciones en el cuerpo, avisa con un objeto vacío', async () => {
    await cuenta.propietario.post('/api/terceros', {
      tipo: 'individual',
      nombres: 'Vacia',
      papel: { tipo: 'cliente', clase: 'directo' },
    });

    expect(recibidas.at(-1)).toMatchObject({ secciones: {} });
  });
});

describe('llave compuesta clientes_id_cuenta_unico (id, cuenta_id)', () => {
  async function conTablaQueReferencia<T>(accion: (conexion: pg.Client) => Promise<T>): Promise<T> {
    const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
    await conexion.connect();
    try {
      await conexion.query('begin');
      await conexion.query(`create table public.referencia_de_prueba (
        cliente_id uuid not null, cuenta_id uuid not null,
        foreign key (cliente_id, cuenta_id) references terceros.clientes (id, cuenta_id))`);
      return await accion(conexion);
    } finally {
      await conexion.query('rollback');
      await conexion.end();
    }
  }

  const insertar = (conexion: pg.Client, clienteId: string, cuentaId: string) =>
    conexion.query('insert into public.referencia_de_prueba values ($1, $2)', [clienteId, cuentaId]);

  it('una tabla de otro módulo puede referenciar al cliente de su misma cuenta', async () => {
    const tercero = await cuenta.propietario.post('/api/terceros', cliente('Referenciado', {}));

    await conTablaQueReferencia(async (conexion) => {
      await insertar(conexion, await clienteIdDe(tercero.cuerpo.id), cuenta.cuentaId);
      const { rowCount } = await conexion.query('select 1 from public.referencia_de_prueba');
      expect(rowCount).toBe(1);
    });
  });

  it('no puede referenciar al cliente de una cuenta con el id de otra', async () => {
    const tercero = await cuenta.propietario.post('/api/terceros', cliente('De otra cuenta', {}));

    await conTablaQueReferencia(async (conexion) => {
      await expect(insertar(conexion, await clienteIdDe(tercero.cuerpo.id), otraCuenta.cuentaId)).rejects.toMatchObject(
        {
          code: '23503',
        },
      );
    });
  });

  it('la restricción única existe sobre (id, cuenta_id)', async () => {
    const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
    await conexion.connect();
    const { rows } = await conexion.query<{ definicion: string }>(
      `select pg_get_constraintdef(oid) as definicion from pg_constraint where conname = 'clientes_id_cuenta_unico'`,
    );
    await conexion.end();

    expect(rows.map((fila) => fila.definicion)).toEqual(['UNIQUE (id, cuenta_id)']);
  });
});
