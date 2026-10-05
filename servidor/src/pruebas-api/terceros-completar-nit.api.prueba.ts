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
const OTRO_NIT = '12345679';
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
async function registrarProveedor(nombre: string, nit?: string) {
  const tercero = await cuenta.propietario.post('/api/terceros', { tipo: 'juridica', razonSocial: nombre, nit });
  expect(tercero.estado).toBe(201);
  await cuenta.propietario.put(`/api/terceros/${tercero.cuerpo.id}/proveedor`, {});
  const ficha = await cuenta.propietario.get(`/api/terceros/${tercero.cuerpo.id}`);
  return { terceroId: tercero.cuerpo.id as string, proveedorId: ficha.cuerpo.proveedor.id as string };
}

async function nitDe(terceroId: string): Promise<string | null> {
  return (await cuenta.propietario.get(`/api/terceros/${terceroId}`)).cuerpo.nit;
}

function completarNit(operadorQueEnvia: Operador, proveedorId: string, nit: string) {
  return mediador.enviar(operadorQueEnvia, 'terceros.completar_nit', { proveedorId, nit });
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

describe('orden terceros.completar_nit por el mediador', () => {
  it('pone el NIT al proveedor que no lo tiene y repetirlo no cambia nada', async () => {
    const { terceroId, proveedorId } = await registrarProveedor('Veterinaria Sin NIT');

    await unidadDeTrabajo.ejecutar(operador, () => completarNit(operador, proveedorId, ' 576937-k '));
    await unidadDeTrabajo.ejecutar(operador, () => completarNit(operador, proveedorId, NIT));

    expect(await nitDe(terceroId)).toBe(NIT);
  });

  it('si el proveedor tiene otro NIT, la orden falla y se deshace lo que el que envía ya había escrito', async () => {
    const { proveedorId } = await registrarProveedor('Agro con NIT', OTRO_NIT);

    const operacion = unidadDeTrabajo.ejecutar(operador, async () => {
      await transaccionEnCurso().insert(correlativos).values({ empresaId: operador.empresaId, clave: 'antes-nit' });
      await completarNit(operador, proveedorId, '33333335');
    });

    await expect(operacion).rejects.toMatchObject({ codigo: 'proveedor_con_otro_nit' });
    const guardados = await unidadDeTrabajo.ejecutar(operador, () =>
      transaccionEnCurso().select({ clave: correlativos.clave }).from(correlativos),
    );
    expect(guardados.map((fila) => fila.clave)).not.toContain('antes-nit');
  });

  it('rechaza un NIT que ya es de otro tercero de la cuenta y no deja nada a medias', async () => {
    await registrarProveedor('Dueño del NIT', '11111119');
    const { terceroId, proveedorId } = await registrarProveedor('Quiere el mismo NIT');

    const operacion = unidadDeTrabajo.ejecutar(operador, () => completarNit(operador, proveedorId, '11111119'));

    await expect(operacion).rejects.toMatchObject({ codigo: 'nit_ya_registrado' });
    expect(await nitDe(terceroId)).toBeNull();
  });

  it('rechaza un NIT inválido y consumidor final', async () => {
    const { terceroId, proveedorId } = await registrarProveedor('Proveedor de NIT malo');

    const invalido = unidadDeTrabajo.ejecutar(operador, () => completarNit(operador, proveedorId, '5769370'));
    const consumidorFinal = unidadDeTrabajo.ejecutar(operador, () => completarNit(operador, proveedorId, 'CF'));

    await expect(invalido).rejects.toMatchObject({ codigo: 'nit_invalido' });
    await expect(consumidorFinal).rejects.toMatchObject({ codigo: 'nit_de_proveedor_sin_numero' });
    expect(await nitDe(terceroId)).toBeNull();
  });

  it('si el que envía falla después de completar el NIT, el NIT también se deshace (transacción anidada)', async () => {
    const { terceroId, proveedorId } = await registrarProveedor('Proveedor que se deshace');

    const operacion = unidadDeTrabajo.ejecutar(operador, async () => {
      await completarNit(operador, proveedorId, '22222227');
      throw new RechazoDelDestino();
    });

    await expect(operacion).rejects.toThrow(RechazoDelDestino);
    expect(await nitDe(terceroId)).toBeNull();
  });

  it('un proveedor de otra cuenta no se ve: responde como si no existiera', async () => {
    const ajena = await darDeAltaCuenta(entorno, {
      nombre: 'Ajena',
      usuario: 'propietarioajeno',
      modulos: ['terceros'],
    });
    const otro = await ajena.propietario.post('/api/terceros', { tipo: 'juridica', razonSocial: 'Ajeno' });
    await ajena.propietario.put(`/api/terceros/${otro.cuerpo.id}/proveedor`, {});
    const ficha = await ajena.propietario.get(`/api/terceros/${otro.cuerpo.id}`);

    const operacion = unidadDeTrabajo.ejecutar(operador, () => completarNit(operador, ficha.cuerpo.proveedor.id, NIT));

    await expect(operacion).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});
