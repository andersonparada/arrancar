/**
 * Prueba de integración contra PostgreSQL: la tabla `facturas_anteriores` (restricciones, únicos, llaves y seguridad
 * por empresa) y su uso desde las notas del libro (`factura_anterior_id`, `otra_causa_sin_credito`).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import {
  contextoDe,
  documentoValido,
  errorDePostgres,
  insertarDocumento,
  prepararEscenario,
  type Escenario,
} from './documentos.soporte.js';
import { facturasAnteriores } from './facturas-anteriores.tablas.js';

let e: Escenario;
let secuencia = 0;

const enA1 = () => contextoDe(e, e.empresaA1, e.cuentaA);
const enA2 = () => contextoDe(e, e.empresaA2, e.cuentaA);

/** Una factura anterior válida (factura, Q112 con IVA, dio crédito) con número propio. */
const valores = (cambios: Record<string, unknown> = {}) => {
  secuencia += 1;
  return {
    empresaId: e.empresaA1,
    proveedorId: e.proveedorA,
    tipo: 'factura',
    serie: 'ANT',
    numero: `F${secuencia}`,
    fechaEmision: '2025-10-10',
    total: '112',
    iva: '12',
    ...cambios,
  } as typeof facturasAnteriores.$inferInsert;
};
const crearAnterior = async (cambios: Record<string, unknown> = {}, contexto = enA1()) => {
  const [fila] = await enTransaccionSegura(contexto, (tx) =>
    tx.insert(facturasAnteriores).values(valores(cambios)).returning(),
  );
  return fila!.id;
};
const restriccionDeAnterior = async (cambios: Record<string, unknown>, contexto = enA1()) =>
  (await errorDePostgres(crearAnterior(cambios, contexto)))?.constraint;

/** Una nota de crédito sobre una factura anterior, recibida en abril. */
const nota = (facturaAnteriorId: string | null, cambios: Record<string, unknown> = {}) => ({
  tipo: 'nota_de_credito',
  facturaAnteriorId,
  fechaEmision: '2026-04-10',
  fechaRecepcion: '2026-04-12',
  periodo: '2026-04-01',
  ...cambios,
});
const crearDocumento = (cambios: Record<string, unknown> = {}) =>
  insertarDocumento(documentoValido(e, cambios), enA1());
const restriccionDeDocumento = async (cambios: Record<string, unknown>) =>
  (await errorDePostgres(crearDocumento(cambios)))?.constraint;

beforeAll(async () => {
  e = await prepararEscenario('facturasanteriores');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('facturas anteriores: seguridad por empresa', () => {
  it('cada empresa ve solo las suyas, y no puede escribir en otra', async () => {
    await crearAnterior();
    const visibles = (contexto: ReturnType<typeof enA1>) =>
      enTransaccionSegura(contexto, (tx) => tx.select().from(facturasAnteriores));

    expect(await visibles(enA1())).toHaveLength(1);
    expect(await visibles(enA2())).toEqual([]);
    await expect(crearAnterior({ empresaId: e.empresaA1 }, enA2())).rejects.toThrow();
  });
});

describe('facturas anteriores: restricciones', () => {
  it('acepta una factura válida, con y sin serie', async () => {
    await expect(crearAnterior()).resolves.toBeTruthy();
    await expect(crearAnterior({ serie: null })).resolves.toBeTruthy();
  });

  it('solo familias de factura que admiten notas (no factura especial ni recibo)', async () => {
    expect(await restriccionDeAnterior({ tipo: 'factura_especial' })).toBe('facturas_anteriores_tipo_valido');
    expect(await restriccionDeAnterior({ tipo: 'recibo' })).toBe('facturas_anteriores_tipo_valido');
    expect(await restriccionDeAnterior({ tipo: 'nota_de_credito' })).toBe('facturas_anteriores_tipo_valido');
  });

  it('serie y número en mayúsculas, sin espacios y de 1 a 40', async () => {
    expect(await restriccionDeAnterior({ serie: 'a b' })).toBe('facturas_anteriores_serie_valida');
    expect(await restriccionDeAnterior({ serie: 'abc' })).toBe('facturas_anteriores_serie_valida');
    expect(await restriccionDeAnterior({ numero: 'a1' })).toBe('facturas_anteriores_numero_valido');
    expect(await restriccionDeAnterior({ numero: 'X'.repeat(41) })).toBe('facturas_anteriores_numero_valido');
  });

  it('el motivo es uno de la lista (sin la nota de débito tardía)', async () => {
    expect(await restriccionDeAnterior({ motivoSinCredito: 'nota_de_debito_tardia' })).toBe(
      'facturas_anteriores_motivo_valido',
    );
    expect(await restriccionDeAnterior({ motivoSinCredito: 'inventado' })).toBe('facturas_anteriores_motivo_valido');
    await expect(crearAnterior({ motivoSinCredito: 'no_vinculado' })).resolves.toBeTruthy();
  });

  it('«otra causa» exige detalle, de hasta 500 caracteres', async () => {
    const otra = { motivoSinCredito: 'otra_causa_sin_credito' };

    expect(await restriccionDeAnterior(otra)).toBe('facturas_anteriores_detalle_del_motivo');
    expect(await restriccionDeAnterior({ ...otra, detalleDelMotivo: '  ' })).toBe(
      'facturas_anteriores_detalle_del_motivo',
    );
    expect(await restriccionDeAnterior({ ...otra, detalleDelMotivo: 'x'.repeat(501) })).toBe(
      'facturas_anteriores_detalle_del_motivo',
    );
    await expect(crearAnterior({ ...otra, detalleDelMotivo: 'Otro NIT' })).resolves.toBeTruthy();
  });

  it('total positivo e IVA entre 0 y el total', async () => {
    expect(await restriccionDeAnterior({ total: '0', iva: '0' })).toBe('facturas_anteriores_total_positivo');
    expect(await restriccionDeAnterior({ iva: '113' })).toBe('facturas_anteriores_iva_rango');
    expect(await restriccionDeAnterior({ iva: '-1' })).toBe('facturas_anteriores_iva_rango');
  });

  it('las notas de débito anteriores no son negativas y su IVA no pasa de su total', async () => {
    const debito = (total: string, iva: string) => ({
      notasDeDebitoAnterioresTotal: total,
      notasDeDebitoAnterioresIva: iva,
    });

    expect(await restriccionDeAnterior(debito('10', '11'))).toBe('facturas_anteriores_notas_de_debito_rango');
    expect(await restriccionDeAnterior(debito('-5', '0'))).toBe('facturas_anteriores_notas_de_debito_rango');
    expect(await restriccionDeAnterior(debito('10', '-1'))).toBe('facturas_anteriores_notas_de_debito_rango');
    await expect(crearAnterior(debito('11.20', '1.20'))).resolves.toBeTruthy();
  });

  it('las familias sin IVA llevan su motivo y no cobran IVA, tampoco en las notas de débito anteriores', async () => {
    const pequeno = { tipo: 'factura_pequeno_contribuyente', motivoSinCredito: 'pequeno_contribuyente' };

    await expect(crearAnterior({ ...pequeno, iva: '0' })).resolves.toBeTruthy();
    expect(await restriccionDeAnterior({ ...pequeno, iva: '5' })).toBe('facturas_anteriores_sin_iva');
    expect(
      await restriccionDeAnterior({
        ...pequeno,
        iva: '0',
        notasDeDebitoAnterioresTotal: '10',
        notasDeDebitoAnterioresIva: '1',
      }),
    ).toBe('facturas_anteriores_sin_iva');
    expect(await restriccionDeAnterior({ tipo: 'factura_pequeno_contribuyente', iva: '0' })).toBe(
      'facturas_anteriores_motivo_de_la_familia',
    );
    expect(await restriccionDeAnterior({ motivoSinCredito: 'pequeno_contribuyente', iva: '0' })).toBe(
      'facturas_anteriores_motivo_de_la_familia',
    );
  });

  it('una factura exenta no cobra IVA', async () => {
    expect(await restriccionDeAnterior({ motivoSinCredito: 'exento' })).toBe('facturas_anteriores_sin_iva');
    await expect(crearAnterior({ motivoSinCredito: 'exento', iva: '0' })).resolves.toBeTruthy();
  });

  it('la factura primario/pecuario no es anterior a su inicio', async () => {
    const primario = { tipo: 'factura_primario_pecuario', motivoSinCredito: 'primario_pecuario', iva: '0' };

    expect(await restriccionDeAnterior({ ...primario, fechaEmision: '2025-04-08' })).toBe(
      'facturas_anteriores_primario_pecuario_desde',
    );
    await expect(crearAnterior({ ...primario, fechaEmision: '2025-04-09' })).resolves.toBeTruthy();
  });
});

describe('facturas anteriores: únicos y llaves', () => {
  it('la misma serie y número del mismo proveedor no se repite, aunque cambie la familia', async () => {
    await crearAnterior({ serie: 'UNI', numero: '1' });

    expect(await restriccionDeAnterior({ serie: 'UNI', numero: '1' })).toBe('facturas_anteriores_del_proveedor_unica');
    expect(
      await restriccionDeAnterior({
        serie: 'UNI',
        numero: '1',
        tipo: 'factura_pequeno_contribuyente',
        motivoSinCredito: 'pequeno_contribuyente',
        iva: '0',
      }),
    ).toBe('facturas_anteriores_del_proveedor_unica');
    await expect(crearAnterior({ serie: 'UNI', numero: '1', proveedorId: e.proveedorA2 })).resolves.toBeTruthy();
    await expect(crearAnterior({ serie: null, numero: '1' })).resolves.toBeTruthy();
    expect(await restriccionDeAnterior({ serie: null, numero: '1' })).toBe('facturas_anteriores_del_proveedor_unica');
  });

  it('la misma autorización FEL no se repite en la empresa; sin autorización sí', async () => {
    const autorizacionFel = crypto.randomUUID();
    await crearAnterior({ autorizacionFel });

    expect(await restriccionDeAnterior({ autorizacionFel })).toBe('facturas_anteriores_autorizacion_fel_unica');
    await expect(crearAnterior({ autorizacionFel: null })).resolves.toBeTruthy();
    await expect(crearAnterior({ autorizacionFel: null })).resolves.toBeTruthy();
  });

  it('el proveedor debe ser de la cuenta', async () => {
    expect(await restriccionDeAnterior({ proveedorId: e.proveedorB })).toBe('facturas_anteriores_proveedor_fk');
  });
});

describe('notas con factura anterior', () => {
  it('una nota de crédito o de débito cita una factura anterior del mismo proveedor', async () => {
    const anterior = await crearAnterior();

    await expect(crearDocumento(nota(anterior))).resolves.toBeTruthy();
    await expect(crearDocumento(nota(anterior, { tipo: 'nota_de_debito' }))).resolves.toBeTruthy();
    expect(await restriccionDeDocumento(nota(anterior, { proveedorId: e.proveedorA2 }))).toBe(
      'documentos_factura_anterior_fk',
    );
    expect(await restriccionDeDocumento(nota(crypto.randomUUID()))).toBe('documentos_factura_anterior_fk');
  });

  it('la nota cita una sola factura: del libro o anterior, no las dos ni ninguna', async () => {
    const anterior = await crearAnterior();
    const factura = await crearDocumento();

    expect(await restriccionDeDocumento(nota(anterior, { documentoAfectadoId: factura }))).toBe(
      'documentos_nota_con_factura',
    );
    expect(await restriccionDeDocumento(nota(null))).toBe('documentos_nota_con_factura');
    await expect(crearDocumento(nota(null, { documentoAfectadoId: factura }))).resolves.toBeTruthy();
  });

  it('una factura no cita factura anterior', async () => {
    const anterior = await crearAnterior();

    expect(await restriccionDeDocumento({ facturaAnteriorId: anterior })).toBe('documentos_nota_con_factura');
  });

  it('una factura anterior de otra empresa no se puede citar', async () => {
    const deA2 = await crearAnterior({ empresaId: e.empresaA2 }, enA2());

    expect(await restriccionDeDocumento(nota(deA2))).toBe('documentos_factura_anterior_fk');
  });
});

describe('«otra causa» (otra_causa_sin_credito) en los documentos', () => {
  const OTRA = { motivoSinCredito: 'otra_causa_sin_credito', iva: '12', ivaNoAcreditable: '12' };

  it('una factura la lleva con detalle y su IVA va al costo', async () => {
    await expect(crearDocumento({ ...OTRA, observaciones: 'Otro NIT' })).resolves.toBeTruthy();
    expect(await restriccionDeDocumento({ ...OTRA, ivaNoAcreditable: '0', observaciones: 'Otro NIT' })).toBe(
      'documentos_iva_no_acreditable_por_motivo',
    );
  });

  it('una factura sin detalle se rechaza', async () => {
    expect(await restriccionDeDocumento(OTRA)).toBe('documentos_otra_causa_con_detalle');
  });

  it('una nota de crédito sobre factura anterior la hereda, con el IVA al costo y sin detalle propio', async () => {
    const anterior = await crearAnterior({ motivoSinCredito: 'otra_causa_sin_credito', detalleDelMotivo: 'x' });

    await expect(crearDocumento(nota(anterior, OTRA))).resolves.toBeTruthy();
    expect(await restriccionDeDocumento(nota(anterior, { ...OTRA, ivaNoAcreditable: '0' }))).toBe(
      'documentos_iva_no_acreditable_por_motivo',
    );
  });
});
