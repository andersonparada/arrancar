/**
 * Prueba de integración contra PostgreSQL: las aplicaciones de notas (mismo proveedor, montos, cascada) y las
 * condiciones de pago de cada proveedor (por cuenta, días entre 0 y 365).
 */
import { readFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { aplicacionesDeNotas } from './aplicaciones-de-notas.tablas.js';
import { condicionesDeProveedor } from './condiciones-de-proveedor.tablas.js';
import { documentos } from './documentos.tablas.js';
import {
  contextoDe,
  crearDocumentoDeLibro,
  crearProveedor,
  documentoValido,
  errorDePostgres,
  prepararEscenario,
  type Escenario,
} from './escenario.soporte.js';

let e: Escenario;
const contexto = () => contextoDe(e, e.empresaA1, e.cuentaA);

async function crear(cambios: Record<string, unknown> = {}) {
  const documentoId = await crearDocumentoDeLibro(contexto(), (cambios.proveedorId as string) ?? e.proveedorA);
  const [fila] = await enTransaccionSegura(contexto(), (tx) =>
    tx
      .insert(documentos)
      .values(documentoValido(e, documentoId, cambios))
      .returning(),
  );
  return fila!;
}

const unaNota = async (proveedorId = e.proveedorA) => {
  const factura = await crear({ proveedorId });
  return crear({
    proveedorId,
    tipo: 'nota_de_credito',
    vencimiento: null,
    documentoAfectadoId: factura.documentoId,
  });
};

interface OpcionesDeAplicar {
  proveedorId?: string;
  monto?: string;
  forma?: string;
  referencia?: string | null;
  fecha?: string;
}

const aplicar = (notaId: string, cargoId: string, opciones: OpcionesDeAplicar = {}) => {
  const { proveedorId = e.proveedorA, monto = '50', forma, referencia, fecha = '2026-03-10' } = opciones;
  return enTransaccionSegura(contexto(), (tx) =>
    tx
      .insert(aplicacionesDeNotas)
      .values({ empresaId: e.empresaA1, proveedorId, notaId, cargoId, monto, forma, referencia, fecha }),
  );
};

/** Corre las sentencias de relleno de la migración 0004 sobre una fila sin fecha (el propietario ve todo). */
async function rellenarLaFechaComoLaMigracion(notaId: string): Promise<void> {
  const sql = readFileSync(new URL('../../migraciones/0004_cp2_notas_de_credito.sql', import.meta.url), 'utf8');
  const relleno = sql.split('--> statement-breakpoint').filter((parte) => /UPDATE[^;]*SET "fecha"/.test(parte));
  const tabla = 'cuentas_por_pagar.aplicaciones_de_notas';
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    await conexion.query(`alter table ${tabla} alter column fecha drop not null`);
    await conexion.query(`update ${tabla} set fecha = null where nota_id = $1`, [notaId]);
    for (const sentencia of relleno) await conexion.query(sentencia.replace(/^--.*$/gm, ''));
    await conexion.query(`alter table ${tabla} alter column fecha set not null`);
  } finally {
    await conexion.end();
  }
}

beforeAll(async () => {
  e = await prepararEscenario('cuentasporpagaraplicaciones');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('aplicaciones de notas', () => {
  it('aplica una nota a un cargo del mismo proveedor, una sola vez por par si es automática', async () => {
    const nota = await unaNota();
    const cargo = await crear();
    await aplicar(nota.id, cargo.id);

    const repetida = await errorDePostgres(aplicar(nota.id, cargo.id));

    expect(repetida?.constraint).toBe('aplicaciones_automatica_unica');
  });

  it('acepta dos manuales del mismo par (se compensa por partes en fechas distintas)', async () => {
    const nota = await unaNota();
    const cargo = await crear();
    await aplicar(nota.id, cargo.id, { forma: 'manual', fecha: '2026-04-01' });
    await aplicar(nota.id, cargo.id, { forma: 'manual', fecha: '2026-05-01', referencia: 'Acuerdo del 1 de mayo' });
    await aplicar(nota.id, cargo.id);

    const filas = await enTransaccionSegura(contexto(), (tx) =>
      tx.select().from(aplicacionesDeNotas).where(eq(aplicacionesDeNotas.notaId, nota.id)),
    );

    expect(filas.map((fila) => fila.forma).sort()).toEqual(['automatica', 'manual', 'manual']);
  });

  it('la forma es automática, manual o contraseña; la referencia solo en manuales, recortada y de hasta 100', async () => {
    const nota = await unaNota();
    const cargo = await crear();
    const conReferencia = (referencia: string, forma = 'manual') => aplicar(nota.id, cargo.id, { forma, referencia });
    const restriccion = async (operacion: Promise<unknown>) => (await errorDePostgres(operacion))?.constraint;

    expect(await restriccion(aplicar(nota.id, cargo.id, { forma: 'otra' }))).toBe('aplicaciones_forma_valida');
    expect(await restriccion(conReferencia('Acuerdo', 'automatica'))).toBe('aplicaciones_referencia_valida');
    expect(await restriccion(conReferencia(' Acuerdo '))).toBe('aplicaciones_referencia_valida');
    expect(await restriccion(conReferencia(''))).toBe('aplicaciones_referencia_valida');
    expect(await restriccion(conReferencia('x'.repeat(101)))).toBe('aplicaciones_referencia_valida');
    await expect(conReferencia('x'.repeat(100))).resolves.toBeDefined();
  });

  it('el relleno de la migración pone la fecha de recepción de la nota en las filas anteriores', async () => {
    const nota = await unaNota();
    const cargo = await crear();
    await aplicar(nota.id, cargo.id, { fecha: '2000-01-01' });

    await rellenarLaFechaComoLaMigracion(nota.id);

    const [fila] = await enTransaccionSegura(contexto(), (tx) =>
      tx.select().from(aplicacionesDeNotas).where(eq(aplicacionesDeNotas.notaId, nota.id)),
    );
    expect(fila?.fecha).toBe('2026-03-10');
  });

  it('rechaza aplicar entre proveedores distintos', async () => {
    const nota = await unaNota();
    const cargoAjeno = await crear({ proveedorId: e.proveedorA2 });

    const alCargo = await errorDePostgres(aplicar(nota.id, cargoAjeno.id));
    const alProveedorDelCargo = await errorDePostgres(aplicar(nota.id, cargoAjeno.id, { proveedorId: e.proveedorA2 }));

    expect(alCargo?.constraint).toBe('aplicaciones_cargo_fk');
    expect(alProveedorDelCargo?.constraint).toBe('aplicaciones_nota_fk');
  });

  it('el monto es positivo y la nota no se aplica a sí misma', async () => {
    const nota = await unaNota();
    const cargo = await crear();

    expect((await errorDePostgres(aplicar(nota.id, cargo.id, { monto: '0' })))?.constraint).toBe(
      'aplicaciones_monto_positivo',
    );
    expect((await errorDePostgres(aplicar(nota.id, nota.id)))?.constraint).toBe('aplicaciones_distintos');
  });

  it('al borrar la nota se van sus aplicaciones, pero un cargo con aplicaciones no se borra', async () => {
    const nota = await unaNota();
    const cargo = await crear();
    await aplicar(nota.id, cargo.id);

    const alBorrarElCargo = await errorDePostgres(
      enTransaccionSegura(contexto(), (tx) => tx.delete(documentos).where(eq(documentos.id, cargo.id))),
    );
    await enTransaccionSegura(contexto(), (tx) => tx.delete(documentos).where(eq(documentos.id, nota.id)));
    const quedan = await enTransaccionSegura(contexto(), (tx) =>
      tx.select().from(aplicacionesDeNotas).where(eq(aplicacionesDeNotas.cargoId, cargo.id)),
    );

    expect(alBorrarElCargo?.code).toBe('23503');
    expect(quedan).toEqual([]);
  });

  it('cada empresa ve solo sus aplicaciones', async () => {
    const nota = await unaNota();
    const cargo = await crear();
    await aplicar(nota.id, cargo.id);

    const enA2 = await enTransaccionSegura(contextoDe(e, e.empresaA2, e.cuentaA), (tx) =>
      tx.select().from(aplicacionesDeNotas),
    );

    expect(enA2).toEqual([]);
  });
});

describe('condiciones de proveedor', () => {
  const guardar = (
    proveedorId: string,
    diasDeCredito: number | null,
    [empresaId, cuentaId] = [e.empresaA1, e.cuentaA],
  ) =>
    enTransaccionSegura(contextoDe(e, empresaId, cuentaId), (tx) =>
      tx.insert(condicionesDeProveedor).values({ proveedorId, diasDeCredito }),
    );

  it('guarda los días de crédito, o ninguno para usar el plazo por omisión', async () => {
    await guardar(e.proveedorA, 15);
    await guardar(e.proveedorA2, null);

    const filas = await enTransaccionSegura(contexto(), (tx) =>
      tx.select().from(condicionesDeProveedor).where(eq(condicionesDeProveedor.proveedorId, e.proveedorA)),
    );

    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ cuentaId: e.cuentaA, diasDeCredito: 15 });
  });

  it('los días van de 0 (contado) a 365', async () => {
    const proveedor = await crearProveedor(contexto(), 'Proveedor nuevo');

    expect((await errorDePostgres(guardar(proveedor, -1)))?.constraint).toBe('condiciones_dias_de_credito_rango');
    expect((await errorDePostgres(guardar(proveedor, 366)))?.constraint).toBe('condiciones_dias_de_credito_rango');
    await expect(guardar(proveedor, 0)).resolves.toBeDefined();
  });

  it('un proveedor tiene una sola fila', async () => {
    const error = await errorDePostgres(guardar(e.proveedorA, 30));

    expect(error?.constraint).toBe('condiciones_proveedor_unico');
  });

  it('la fila es de la cuenta: otra cuenta no la ve ni crea la de un proveedor ajeno', async () => {
    const deOtraCuenta = await enTransaccionSegura(contextoDe(e, e.empresaB, e.cuentaB), (tx) =>
      tx.select().from(condicionesDeProveedor),
    );
    const sinFila = await crearProveedor(contexto(), 'Proveedor sin condiciones');
    const ajeno = await errorDePostgres(guardar(sinFila, 10, [e.empresaB, e.cuentaB]));

    expect(deOtraCuenta).toEqual([]);
    expect(ajeno?.constraint).toBe('condiciones_proveedor_fk');
  });

  it('todas las empresas de la cuenta ven la misma fila', async () => {
    const enA2 = await enTransaccionSegura(contextoDe(e, e.empresaA2, e.cuentaA), (tx) =>
      tx.select().from(condicionesDeProveedor).where(eq(condicionesDeProveedor.proveedorId, e.proveedorA)),
    );

    expect(enA2).toHaveLength(1);
  });
});
