/**
 * Prueba de integración: dos transacciones a la vez no pueden dejar una cuenta de detalle con cuentas inferiores. El
 * disparador bloquea a la cuenta superior, así que la segunda espera a la primera y ve lo que esta confirmó.
 */
import pg, { type DatabaseError } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import { bdPropietario } from '../../../core/base-datos/sembrado-de-prueba.soporte.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas as cuentasDeSuscriptor } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { eq } from 'drizzle-orm';
import { cuentas } from './cuentas.tablas.js';

let contexto: ContextoEmpresa;
let padreId: string;

const espera = (milisegundos: number) => new Promise((resolver) => setTimeout(resolver, milisegundos));

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  const propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await propietario.connect();
  await propietario.query('truncate core.cuentas, core.usuarios cascade');
  await propietario.end();
  const [suscriptor] = await bd.insert(cuentasDeSuscriptor).values({ nombre: 'Cuenta C' }).returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'contabilidaddos', nombres: 'Contabilidad', hashContrasena: 'x' })
    .returning();
  const [empresa] = await bdPropietario
    .insert(empresas)
    .values({ cuentaId: suscriptor!.id, nombre: 'Empresa C' })
    .returning();
  contexto = { empresaId: empresa!.id, cuentaId: suscriptor!.id, usuarioId: usuario!.id };
  const [padre] = await enTransaccionSegura(contexto, (tx) =>
    tx
      .insert(cuentas)
      .values({
        empresaId: empresa!.id,
        codigo: '1',
        nombre: 'Activo',
        nivel: 1,
        naturaleza: 'deudora',
        tipo: 'balance',
        esDeDetalle: false,
      })
      .returning(),
  );
  padreId = padre!.id;
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('disparador cuentas_hoja_de_detalle con dos conexiones', () => {
  it('quien vuelve de detalle a la cuenta superior espera a quien le inserta una hija, y falla', async () => {
    let soltar!: () => void;
    const puerta = new Promise<void>((resolver) => (soltar = resolver));
    const hija = enTransaccionSegura(contexto, async (tx) => {
      await tx.insert(cuentas).values({
        empresaId: contexto.empresaId,
        codigo: '1.1',
        nombre: 'Hija',
        nivel: 2,
        padreId,
        naturaleza: 'deudora',
        tipo: 'balance',
        esDeDetalle: false,
      });
      await puerta;
    });
    await espera(300);
    const cambio = enTransaccionSegura(contexto, (tx) =>
      tx.update(cuentas).set({ esDeDetalle: true, rubro: 'efectivo' }).where(eq(cuentas.id, padreId)),
    ).then(
      () => undefined,
      (error: unknown) => (error as { cause?: DatabaseError }).cause ?? error,
    );
    await espera(500);
    soltar();
    await hija;

    const error = (await cambio) as DatabaseError | undefined;
    expect(error?.code).toBe('23514');
  });
});
