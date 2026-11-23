/**
 * Prueba de integración: enlazar una cuenta a la vez que otra transacción la cambia. `GuardarEnlace` lee la cuenta con
 * `for no key update`, así que espera a quien la tiene tomada y ve lo que esa confirmó (no reescribe una lectura vieja).
 */
import pg from 'pg';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import { bdPropietario } from '../../../core/base-datos/sembrado-de-prueba.soporte.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import { dependenciasCompartidas } from '../../../core/compartido/infraestructura/dependencias-compartidas.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas as cuentasDeSuscriptor } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { GuardarEnlace } from '../../aplicacion/casos-uso/enlaces/guardar-enlace.js';
import { CuentaInactiva } from '../../dominio/errores.js';
import { ConsultasEnlacesDrizzle } from './consultas-enlaces.drizzle.js';
import { cuentas } from './cuentas.tablas.js';
import { RepositorioCuentasDrizzle } from './repositorio-cuentas.drizzle.js';
import { RepositorioEnlacesDrizzle } from './repositorio-enlaces.drizzle.js';

let operador: Operador;
let cuentaId: string;

const espera = (milisegundos: number) => new Promise((resolver) => setTimeout(resolver, milisegundos));

const guardarEnlace = () =>
  new GuardarEnlace({
    unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
    auditoria: dependenciasCompartidas().auditoria,
    repositorio: new RepositorioEnlacesDrizzle(),
    consultas: new ConsultasEnlacesDrizzle(),
    cuentas: new RepositorioCuentasDrizzle(),
    llaves: { de: async () => [] },
    modulosActivos: { de: async () => new Set<string>() },
  });

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  const propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await propietario.connect();
  await propietario.query('truncate core.cuentas, core.usuarios cascade');
  await propietario.end();
  const [suscriptor] = await bd.insert(cuentasDeSuscriptor).values({ nombre: 'Cuenta E' }).returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'enlaceconcurrente', nombres: 'Enlace', hashContrasena: 'x' })
    .returning();
  const [empresa] = await bdPropietario
    .insert(empresas)
    .values({ cuentaId: suscriptor!.id, nombre: 'Empresa E' })
    .returning();
  operador = { empresaId: empresa!.id, cuentaId: suscriptor!.id, usuarioId: usuario!.id, esSuperacceso: false };
  const [fila] = await enTransaccionSegura(operador, (tx) =>
    tx
      .insert(cuentas)
      .values({
        empresaId: empresa!.id,
        codigo: '1',
        nombre: 'Caja',
        nivel: 1,
        naturaleza: 'deudora',
        tipo: 'balance',
        esDeDetalle: true,
        rubro: 'efectivo',
        claseDeFlujo: 'efectivo',
      })
      .returning(),
  );
  cuentaId = fila!.id;
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('GuardarEnlace con otra transacción sobre la misma cuenta', () => {
  it('espera a quien la inactiva y falla en vez de enlazar una cuenta inactiva', async () => {
    let soltar!: () => void;
    const puerta = new Promise<void>((resolver) => (soltar = resolver));
    const inactivacion = enTransaccionSegura(operador, async (tx) => {
      await tx.select().from(cuentas).where(eq(cuentas.id, cuentaId)).for('no key update');
      await tx.update(cuentas).set({ activo: false }).where(eq(cuentas.id, cuentaId));
      await puerta;
    });
    await espera(300);
    let terminado = false;
    const enlace = guardarEnlace()
      .ejecutar(operador, { rol: 'iva_credito_fiscal', solicitud: { llave: null, cuentaId } })
      .then(
        () => undefined,
        (error: unknown) => error,
      )
      .finally(() => (terminado = true));
    await espera(500);
    expect(terminado).toBe(false);
    soltar();
    await inactivacion;

    expect(await enlace).toBeInstanceOf(CuentaInactiva);
  });
});
