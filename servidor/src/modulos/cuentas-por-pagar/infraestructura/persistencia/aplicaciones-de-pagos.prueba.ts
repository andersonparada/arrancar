/**
 * Prueba de integración contra PostgreSQL: las líneas de un pago (llaves compuestas hacia el pago, el cargo y la
 * contraseña de cada línea, retención en un solo pago vigente, cascada y RLS).
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { aplicacionesDePagos } from './aplicaciones-de-pagos.tablas.js';
import { contrasenaDocumentos } from './contrasena-documentos.tablas.js';
import { contrasenas } from './contrasenas.tablas.js';
import { documentos } from './documentos.tablas.js';
import {
  contextoDe,
  crearDocumentoDeLibro,
  documentoValido,
  errorDePostgres,
  prepararEscenario,
  type Escenario,
} from './escenario.soporte.js';
import { prepararBancos } from './movimientos-de-bancos.soporte.js';
import { pagos } from './pagos.tablas.js';

let e: Escenario;
let nuevoMovimiento: () => Promise<string>;
let secuencia = 0;
const contexto = () => contextoDe(e, e.empresaA1, e.cuentaA);

async function crearDocumento(proveedorId = e.proveedorA) {
  const documentoId = await crearDocumentoDeLibro(contexto(), proveedorId);
  const [fila] = await enTransaccionSegura(contexto(), (tx) =>
    tx
      .insert(documentos)
      .values(documentoValido(e, documentoId, { proveedorId }))
      .returning(),
  );
  return fila!;
}

async function crearContrasena() {
  secuencia += 1;
  const [fila] = await enTransaccionSegura(contexto(), (tx) =>
    tx
      .insert(contrasenas)
      .values({
        empresaId: e.empresaA1,
        proveedorId: e.proveedorA,
        numero: secuencia,
        fecha: '2026-03-10',
        fechaDePago: '2026-04-10',
      })
      .returning(),
  );
  return fila!;
}

async function crearPago(proveedorId = e.proveedorA) {
  secuencia += 1;
  const [fila] = await enTransaccionSegura(contexto(), async (tx) =>
    tx
      .insert(pagos)
      .values({
        empresaId: e.empresaA1,
        proveedorId,
        numero: secuencia,
        forma: 'cheque',
        fecha: '2026-03-15',
        monto: '100',
        movimientoId: await nuevoMovimiento(),
      })
      .returning(),
  );
  return fila!;
}

const restriccion = async (operacion: Promise<unknown>) => (await errorDePostgres(operacion))?.constraint;

beforeAll(async () => {
  e = await prepararEscenario('cuentasporpagaraplicaciones');
  nuevoMovimiento = await prepararBancos(contexto());
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('líneas de un pago', () => {
  async function pagoConDocumento() {
    const contrasena = await crearContrasena();
    const documento = await crearDocumento();
    await enTransaccionSegura(contexto(), (tx) =>
      tx.insert(contrasenaDocumentos).values({
        empresaId: e.empresaA1,
        proveedorId: e.proveedorA,
        contrasenaId: contrasena.id,
        documentoId: documento.id,
      }),
    );
    return { pago: await crearPago(), contrasena, documento };
  }

  const aplicar = (
    base: { pago: { id: string }; contrasena: { id: string }; documento: { id: string } },
    cambios: Partial<typeof aplicacionesDePagos.$inferInsert> = {},
  ) =>
    enTransaccionSegura(contexto(), (tx) =>
      tx.insert(aplicacionesDePagos).values({
        empresaId: e.empresaA1,
        proveedorId: e.proveedorA,
        pagoId: base.pago.id,
        contrasenaId: base.contrasena.id,
        cargoId: base.documento.id,
        monto: '50',
        ...cambios,
      }),
    );

  it('aplica un cargo de la contraseña, una sola vez por pago', async () => {
    const base = await pagoConDocumento();
    await aplicar(base);

    expect(await restriccion(aplicar(base))).toBe('aplicaciones_de_pagos_par_unico');
  });

  it('el monto es positivo y la retención no es negativa', async () => {
    const base = await pagoConDocumento();

    expect(await restriccion(aplicar(base, { monto: '0' }))).toBe('aplicaciones_de_pagos_monto_positivo');
    expect(await restriccion(aplicar(base, { retencionDescontada: '-1' }))).toBe(
      'aplicaciones_de_pagos_retencion_valida',
    );
  });

  it('rechaza un cargo que no está en la contraseña del pago', async () => {
    const base = await pagoConDocumento();
    const fuera = await crearDocumento();

    expect(await restriccion(aplicar(base, { cargoId: fuera.id }))).toBe('aplicaciones_de_pagos_en_la_contrasena_fk');
  });

  it('un pago cubre cargos de varias contraseñas del mismo proveedor', async () => {
    const primera = await pagoConDocumento();
    const segunda = await pagoConDocumento();

    await aplicar(primera);
    await expect(aplicar({ ...segunda, pago: primera.pago })).resolves.toBeDefined();
  });

  it('rechaza un cargo de otro proveedor y un pago de otro proveedor', async () => {
    const base = await pagoConDocumento();
    const ajeno = await crearDocumento(e.proveedorA2);
    const deOtro = await crearPago(e.proveedorA2);

    expect(await restriccion(aplicar(base, { cargoId: ajeno.id }))).toBe('aplicaciones_de_pagos_cargo_fk');
    expect(await restriccion(aplicar({ ...base, pago: deOtro }))).toBe('aplicaciones_de_pagos_pago_fk');
  });

  it('rechaza una línea cuya contraseña no contiene el cargo', async () => {
    const base = await pagoConDocumento();
    const otra = await crearContrasena();

    expect(await restriccion(aplicar(base, { contrasenaId: otra.id }))).toBe(
      'aplicaciones_de_pagos_en_la_contrasena_fk',
    );
  });

  it('la retención de un cargo se descuenta en un solo pago vigente', async () => {
    const base = await pagoConDocumento();
    const otroPago = await crearPago();
    await aplicar(base, { retencionDescontada: '5' });

    expect(await restriccion(aplicar({ ...base, pago: otroPago }, { retencionDescontada: '3' }))).toBe(
      'aplicaciones_de_pagos_retencion_una_vez',
    );
    await expect(aplicar({ ...base, pago: otroPago })).resolves.toBeDefined();
  });

  it('con el primer pago anulado, otro puede descontar la retención', async () => {
    const base = await pagoConDocumento();
    const otroPago = await crearPago();
    await aplicar(base, { retencionDescontada: '5', vigente: false });

    await expect(aplicar({ ...base, pago: otroPago }, { retencionDescontada: '5' })).resolves.toBeDefined();
  });

  it('un cargo con líneas de pagos no se quita de su contraseña, pero al eliminarlo se van sus líneas', async () => {
    const base = await pagoConDocumento();
    await aplicar(base);

    const alQuitar = await errorDePostgres(
      enTransaccionSegura(contexto(), (tx) =>
        tx.delete(contrasenaDocumentos).where(eq(contrasenaDocumentos.documentoId, base.documento.id)),
      ),
    );
    await enTransaccionSegura(contexto(), (tx) => tx.delete(documentos).where(eq(documentos.id, base.documento.id)));
    const quedan = await enTransaccionSegura(contexto(), (tx) => tx.select().from(aplicacionesDePagos));

    expect(alQuitar?.constraint).toBe('aplicaciones_de_pagos_en_la_contrasena_fk');
    expect(quedan.filter((fila) => fila.cargoId === base.documento.id)).toEqual([]);
  });

  it('cada empresa ve solo las líneas de sus pagos', async () => {
    await aplicar(await pagoConDocumento());

    const enA2 = await enTransaccionSegura(contextoDe(e, e.empresaA2, e.cuentaA), (tx) =>
      tx.select().from(aplicacionesDePagos),
    );

    expect(enA2).toEqual([]);
  });
});
