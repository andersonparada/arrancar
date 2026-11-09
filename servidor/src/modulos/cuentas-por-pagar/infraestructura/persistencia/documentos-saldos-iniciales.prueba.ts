/**
 * Prueba de integración contra PostgreSQL: lo que U8 agrega a `cuentas_por_pagar.documentos` (saldos iniciales): las
 * restricciones de origen, saldo al inicio, retenciones por practicar y referencia, la llave del proveedor, el único por
 * documento, el relleno de la migración y la seguridad por empresa.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { documentos } from './documentos.tablas.js';
import {
  contextoDe,
  crearDocumentoDeLibro,
  documentoValido,
  errorDePostgres,
  prepararEscenario,
  type Escenario,
} from './escenario.soporte.js';

let e: Escenario;
const contexto = () => contextoDe(e, e.empresaA1, e.cuentaA);

const insertar = (valores: typeof documentos.$inferInsert) =>
  enTransaccionSegura(contexto(), (tx) => tx.insert(documentos).values(valores).returning());

let secuencia = 0;

/** Un saldo inicial de Q1,120 con Q1,000 pendientes, sin retenciones, ya completado. */
function saldoValido(cambios: Record<string, unknown> = {}): typeof documentos.$inferInsert {
  secuencia += 1;
  return {
    empresaId: e.empresaA1,
    origen: 'saldo_inicial',
    documentoId: null,
    serie: 'S',
    numero: `SALDO${secuencia}`,
    tipo: 'factura',
    proveedorId: e.proveedorA,
    fechaEmision: '2025-12-20',
    total: '1120',
    saldoAlInicio: '1000',
    retencionesPorPracticar: '0',
    vencimiento: '2026-01-20',
    estado: 'registrado',
    registradoEn: new Date(),
    registradoPor: e.usuarioId,
    ...cambios,
  };
}

const crearSaldo = async (cambios: Record<string, unknown> = {}) => (await insertar(saldoValido(cambios)))[0]!;
const restriccionDeSaldo = async (cambios: Record<string, unknown>) =>
  (await errorDePostgres(insertar(saldoValido(cambios))))?.constraint;

/** Una fila del libro con el mismo proveedor, serie y número dados. */
async function crearDelLibro(cambios: Record<string, unknown>) {
  const documentoId = await crearDocumentoDeLibro(contexto(), e.proveedorA);
  return errorDePostgres(insertar(documentoValido(e, documentoId, cambios)));
}

beforeAll(async () => {
  e = await prepararEscenario('cuentasporpagarsaldos');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('saldos iniciales: origen y montos', () => {
  it('guarda un saldo inicial sin documento del libro', async () => {
    const fila = await crearSaldo({ referencia: 'CXP-004512' });

    expect(fila).toMatchObject({ origen: 'saldo_inicial', documentoId: null, saldoAlInicio: '1000.00' });
    expect(fila.referencia).toBe('CXP-004512');
  });

  it('el saldo inicial no lleva documento del libro, y el del libro sí', async () => {
    expect(await restriccionDeSaldo({ documentoId: crypto.randomUUID() })).toBe('documentos_origen_y_documento');
    expect((await crearDelLibro({ documentoId: null }))?.constraint).toBe('documentos_origen_y_documento');
    expect(await restriccionDeSaldo({ origen: 'otro' })).toBe('documentos_origen_valido');
  });

  it('el saldo al inicio es obligatorio en un saldo inicial, positivo y no pasa del neto', async () => {
    expect(await restriccionDeSaldo({ saldoAlInicio: null })).toBe('documentos_saldo_al_inicio_de_saldos');
    expect(await restriccionDeSaldo({ saldoAlInicio: '0' })).toBe('documentos_saldo_al_inicio_valido');
    expect(await restriccionDeSaldo({ saldoAlInicio: '1120.01' })).toBe('documentos_saldo_al_inicio_valido');
    expect(await restriccionDeSaldo({ retenciones: '120', saldoAlInicio: '1000.01' })).toBe(
      'documentos_saldo_al_inicio_valido',
    );
    await expect(crearSaldo({ retenciones: '120', saldoAlInicio: '1000' })).resolves.toBeTruthy();
  });

  it('un documento del libro no trae saldo al inicio', async () => {
    const error = await crearDelLibro({ saldoAlInicio: '10' });

    expect(error?.constraint).toBe('documentos_saldo_al_inicio_de_saldos');
  });

  it('las retenciones por practicar son obligatorias en el saldo inicial y no pasan de las retenciones', async () => {
    expect(await restriccionDeSaldo({ retencionesPorPracticar: null })).toBe('documentos_por_practicar_de_saldos');
    expect(await restriccionDeSaldo({ retencionesPorPracticar: '0.01' })).toBe('documentos_por_practicar_valido');
    await expect(crearSaldo({ retenciones: '120', retencionesPorPracticar: '120' })).resolves.toBeTruthy();
    expect(await restriccionDeSaldo({ retenciones: '120', retencionesPorPracticar: '120.01' })).toBe(
      'documentos_por_practicar_valido',
    );
  });

  it('un documento del libro no trae retenciones por practicar ni referencia', async () => {
    expect((await crearDelLibro({ retencionesPorPracticar: '0' }))?.constraint).toBe(
      'documentos_por_practicar_de_saldos',
    );
    expect((await crearDelLibro({ referencia: 'X' }))?.constraint).toBe('documentos_referencia_de_saldos');
  });

  it('la referencia tiene de 1 a 60 caracteres y sin espacios al borde', async () => {
    await expect(crearSaldo({ referencia: 'x'.repeat(60) })).resolves.toBeTruthy();
    expect(await restriccionDeSaldo({ referencia: 'x'.repeat(61) })).toBe('documentos_referencia_valida');
    expect(await restriccionDeSaldo({ referencia: ' CXP-1' })).toBe('documentos_referencia_valida');
    expect(await restriccionDeSaldo({ referencia: 'CXP-1 ' })).toBe('documentos_referencia_valida');
    expect(await restriccionDeSaldo({ referencia: '' })).toBe('documentos_referencia_valida');
  });
});

describe('saldos iniciales: estado, notas y forma de serie y número', () => {
  it('nunca está pendiente ni anulado', async () => {
    const pendiente = { estado: 'pendiente', registradoEn: null, registradoPor: null };

    expect(await restriccionDeSaldo(pendiente)).toBe('documentos_saldo_inicial_completado');
    await expect(
      crearSaldo({ estado: 'autorizado', autorizadoEn: new Date(), autorizadoPor: crypto.randomUUID() }),
    ).resolves.toBeTruthy();
  });

  it('no apunta a una factura afectada', async () => {
    const nota = { tipo: 'nota_de_debito', documentoAfectadoId: crypto.randomUUID() };

    expect(await restriccionDeSaldo(nota)).toBe('documentos_saldo_inicial_sin_nota_afectada');
  });

  it('una nota de crédito o de débito sin factura afectada sí se carga como saldo inicial', async () => {
    await expect(crearSaldo({ tipo: 'nota_de_debito', total: '200', saldoAlInicio: '200' })).resolves.toBeTruthy();
    await expect(
      crearSaldo({ tipo: 'nota_de_credito', total: '200', saldoAlInicio: '200', vencimiento: null }),
    ).resolves.toBeTruthy();
  });

  it('la serie y el número van en mayúsculas, sin espacios y de 1 a 40', async () => {
    expect(await restriccionDeSaldo({ serie: 'A B' })).toBe('documentos_serie_de_compra_valida');
    expect(await restriccionDeSaldo({ serie: 'a' })).toBe('documentos_serie_de_compra_valida');
    expect(await restriccionDeSaldo({ serie: 'X'.repeat(41) })).toBe('documentos_serie_de_compra_valida');
    expect(await restriccionDeSaldo({ numero: '12 3' })).toBe('documentos_numero_de_compra_valido');
    expect(await restriccionDeSaldo({ numero: '' })).toBe('documentos_numero_de_compra_valido');
    await expect(crearSaldo({ serie: null })).resolves.toBeTruthy();
  });
});

describe('saldos iniciales: llave del proveedor y único por documento', () => {
  it('el proveedor debe existir', async () => {
    expect(await restriccionDeSaldo({ proveedorId: crypto.randomUUID() })).toBe('documentos_proveedor_por_pagar_fk');
  });

  it('dos saldos iniciales iguales chocan; con otro número o proveedor no', async () => {
    const base = { serie: 'U', numero: 'UNICO1' };
    await crearSaldo(base);

    expect(await restriccionDeSaldo(base)).toBe('documentos_numero_por_proveedor_unico');
    await expect(crearSaldo({ ...base, numero: 'UNICO2' })).resolves.toBeTruthy();
    await expect(crearSaldo({ ...base, proveedorId: e.proveedorA2 })).resolves.toBeTruthy();
  });

  it('un saldo inicial y el mismo documento recibido del libro chocan', async () => {
    await crearSaldo({ serie: 'L', numero: 'LIBRO1' });

    const error = await crearDelLibro({ serie: 'L', numero: 'LIBRO1' });

    expect(error?.constraint).toBe('documentos_numero_por_proveedor_unico');
  });

  it('«factura» contra «factura de pequeño contribuyente» chocan; contra un recibo no', async () => {
    await crearSaldo({ serie: 'F', numero: 'FAM1', tipo: 'factura' });

    expect(await restriccionDeSaldo({ serie: 'F', numero: 'FAM1', tipo: 'factura_pequeno_contribuyente' })).toBe(
      'documentos_numero_por_proveedor_unico',
    );
    await expect(crearSaldo({ serie: 'F', numero: 'FAM1', tipo: 'recibo' })).resolves.toBeTruthy();
  });

  it('un documento anulado no cuenta para el único', async () => {
    const base = { serie: 'N', numero: 'ANU1' };
    const anulado = await crearDelLibro({
      ...base,
      estado: 'anulado',
      anuladoPor: e.usuarioId,
      anuladoEn: new Date(),
      motivoDeAnulacion: 'Error',
      estabaAutorizado: false,
    });

    expect(anulado).toBeUndefined();
    await expect(crearSaldo(base)).resolves.toBeTruthy();
  });
});

/** Corre como propietario dentro de una transacción que siempre se deshace. */
async function comoPropietario(trabajo: (conexion: pg.Client) => Promise<void>): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    await conexion.query('begin');
    await trabajo(conexion);
  } finally {
    await conexion.query('rollback');
    await conexion.end();
  }
}

const sentenciaDeLaMigracion = (fragmento: string): string => {
  const ruta = new URL('../../migraciones/0003_u8_saldos_iniciales.sql', import.meta.url);
  const sentencia = readFileSync(ruta, 'utf8')
    .split('--> statement-breakpoint')
    .find((trozo) => trozo.includes(fragmento));
  if (!sentencia) throw new Error(`La migración no tiene «${fragmento}».`);
  return sentencia;
};

describe('migración 0003: relleno y revisión previa del único', () => {
  it('copia la serie y el número del libro a las filas que ya existían', async () => {
    const documentoId = await crearDocumentoDeLibro(contexto(), e.proveedorA);
    await comoPropietario(async (conexion) => {
      await conexion.query('alter table cuentas_por_pagar.documentos alter column numero drop not null');
      await conexion.query(
        'insert into cuentas_por_pagar.documentos (empresa_id, documento_id, tipo, proveedor_id, fecha_emision, total, vencimiento, numero) values ($1, $2, $3, $4, $5, $6, $7, null)',
        [e.empresaA1, documentoId, 'factura', e.proveedorA, '2026-03-10', '112', '2026-04-10'],
      );

      await conexion.query(sentenciaDeLaMigracion('UPDATE "cuentas_por_pagar"'));

      const { rows } = await conexion.query(
        'select d.serie, d.numero, l.serie as serie_libro, l.numero as numero_libro from cuentas_por_pagar.documentos d join libro_de_compras.documentos l on l.id = d.documento_id where d.documento_id = $1',
        [documentoId],
      );
      expect(rows[0].serie).toBe(rows[0].serie_libro);
      expect(rows[0].numero).toBe(rows[0].numero_libro);
      expect(rows[0].numero).toBeTruthy();
    });
  });

  it('avisa en español cuando hay documentos repetidos con distinto tipo de factura', async () => {
    await comoPropietario(async (conexion) => {
      await conexion.query('drop index cuentas_por_pagar.documentos_numero_por_proveedor_unico');
      const sentencia =
        'insert into cuentas_por_pagar.documentos (empresa_id, origen, serie, numero, tipo, proveedor_id, fecha_emision, total, saldo_al_inicio, retenciones_por_practicar, vencimiento, estado, registrado_en, registrado_por) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), $13)';
      for (const tipo of ['factura', 'factura_especial']) {
        const datos = [
          e.empresaA1,
          'saldo_inicial',
          'R',
          'REP1',
          tipo,
          e.proveedorA,
          '2025-12-20',
          '100',
          '100',
          '0',
          '2026-01-20',
          'registrado',
          e.usuarioId,
        ];
        await conexion.query(sentencia, datos);
      }

      await expect(conexion.query(sentenciaDeLaMigracion('DO $$'))).rejects.toThrow(
        /Hay 1 documentos por pagar repetidos con distinto tipo de factura/,
      );
    });
  });
});

describe('saldos iniciales: seguridad por empresa', () => {
  it('cada empresa ve solo sus saldos iniciales', async () => {
    const propio = await crearSaldo();

    const enA2 = await enTransaccionSegura(contextoDe(e, e.empresaA2, e.cuentaA), (tx) => tx.select().from(documentos));
    const enA1 = await enTransaccionSegura(contexto(), (tx) => tx.select().from(documentos));

    expect(enA2).toEqual([]);
    expect(enA1.map((fila) => fila.id)).toContain(propio.id);
  });

  it('no deja crear un saldo inicial en otra empresa', async () => {
    const error = await errorDePostgres(
      enTransaccionSegura(contextoDe(e, e.empresaA2, e.cuentaA), (tx) => tx.insert(documentos).values(saldoValido())),
    );

    expect(error?.code).toBe('42501');
  });
});
