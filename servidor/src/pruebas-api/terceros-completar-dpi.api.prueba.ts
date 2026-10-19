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
const DPI = '1234567890101';
const OTRO_DPI = '2345678130101';
const TERCER_DPI = '3456789150101';
const CUARTO_DPI = '4567891110101';
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

/** Registra un proveedor (con su papel) y devuelve el id del tercero y el del papel. */
async function registrarProveedor(nombre: string, dpi?: string) {
  const tercero = await cuenta.propietario.post('/api/terceros', {
    tipo: 'individual',
    nombres: nombre,
    apellidos: 'Prueba',
    dpi,
  });
  expect(tercero.estado).toBe(201);
  await cuenta.propietario.put(`/api/terceros/${tercero.cuerpo.id}/proveedor`, {});
  const ficha = await cuenta.propietario.get(`/api/terceros/${tercero.cuerpo.id}`);
  return { terceroId: tercero.cuerpo.id as string, proveedorId: ficha.cuerpo.proveedor.id as string };
}

async function dpiDe(terceroId: string): Promise<string | null> {
  return (await cuenta.propietario.get(`/api/terceros/${terceroId}`)).cuerpo.dpi;
}

function completarDpi(operadorQueEnvia: Operador, proveedorId: string, dpi: string) {
  return mediador.enviar(operadorQueEnvia, 'terceros.completar_dpi', { proveedorId, dpi });
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Compras', usuario: 'propietariocompras', modulos: ['terceros'] });
  operador = {
    empresaId: cuenta.empresaId,
    cuentaId: cuenta.cuentaId,
    usuarioId: await idDelSoporte(),
    esSuperacceso: true,
  };
});

describe('orden terceros.completar_dpi por el mediador', () => {
  it('pone el DPI al proveedor que no lo tiene y repetirlo no cambia nada', async () => {
    const { terceroId, proveedorId } = await registrarProveedor('Veterinaria');

    await unidadDeTrabajo.ejecutar(operador, () => completarDpi(operador, proveedorId, ' 1234 56789 0101 '));
    await unidadDeTrabajo.ejecutar(operador, () => completarDpi(operador, proveedorId, DPI));

    expect(await dpiDe(terceroId)).toBe(DPI);
  });

  it('si el proveedor tiene otro DPI, la orden falla y se deshace lo que el que envía ya había escrito', async () => {
    const { proveedorId } = await registrarProveedor('Agro', OTRO_DPI);

    const operacion = unidadDeTrabajo.ejecutar(operador, async () => {
      await transaccionEnCurso().insert(correlativos).values({ empresaId: operador.empresaId, clave: 'antes-dpi' });
      await completarDpi(operador, proveedorId, TERCER_DPI);
    });

    await expect(operacion).rejects.toMatchObject({ codigo: 'proveedor_con_otro_dpi' });
    const guardados = await unidadDeTrabajo.ejecutar(operador, () =>
      transaccionEnCurso().select({ clave: correlativos.clave }).from(correlativos),
    );
    expect(guardados.map((fila) => fila.clave)).not.toContain('antes-dpi');
  });

  it('rechaza un DPI que ya es de otro tercero de la cuenta y no deja nada a medias', async () => {
    await registrarProveedor('Dueño del DPI', TERCER_DPI);
    const { terceroId, proveedorId } = await registrarProveedor('Quiere el mismo DPI');

    const operacion = unidadDeTrabajo.ejecutar(operador, () => completarDpi(operador, proveedorId, TERCER_DPI));

    await expect(operacion).rejects.toMatchObject({ codigo: 'dpi_ya_registrado' });
    expect(await dpiDe(terceroId)).toBeNull();
  });

  it('rechaza un DPI inválido', async () => {
    const { terceroId, proveedorId } = await registrarProveedor('Proveedor de DPI malo');

    const invalido = unidadDeTrabajo.ejecutar(operador, () => completarDpi(operador, proveedorId, '1234567890123'));

    await expect(invalido).rejects.toMatchObject({ codigo: 'dpi_invalido' });
    expect(await dpiDe(terceroId)).toBeNull();
  });

  it('si el que envía falla después de completar el DPI, el DPI también se deshace (transacción anidada)', async () => {
    const { terceroId, proveedorId } = await registrarProveedor('Proveedor que se deshace');

    const operacion = unidadDeTrabajo.ejecutar(operador, async () => {
      await completarDpi(operador, proveedorId, CUARTO_DPI);
      throw new RechazoDelDestino();
    });

    await expect(operacion).rejects.toThrow(RechazoDelDestino);
    expect(await dpiDe(terceroId)).toBeNull();
  });

  it('un proveedor de otra cuenta no se ve: responde como si no existiera', async () => {
    const ajena = await darDeAltaCuenta(entorno, {
      nombre: 'Ajena',
      usuario: 'propietarioajeno',
      modulos: ['terceros'],
    });
    const otro = await ajena.propietario.post('/api/terceros', {
      tipo: 'individual',
      nombres: 'Ajeno',
      apellidos: 'Prueba',
    });
    await ajena.propietario.put(`/api/terceros/${otro.cuerpo.id}/proveedor`, {});
    const ficha = await ajena.propietario.get(`/api/terceros/${otro.cuerpo.id}`);

    const operacion = unidadDeTrabajo.ejecutar(operador, () => completarDpi(operador, ficha.cuerpo.proveedor.id, DPI));

    await expect(operacion).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});
