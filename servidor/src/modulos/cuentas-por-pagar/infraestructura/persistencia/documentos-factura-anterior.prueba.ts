/**
 * Prueba de integración contra PostgreSQL: lo que U8l-2 cambia en `cuentas_por_pagar.documentos`: la llave de una nota
 * apunta al id propio de su factura (del libro o saldo inicial), la marca `factura_del_sistema_anterior` y la
 * migración `0007` que convierte los ids viejos.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import type { TipoDeDocumento } from '../../dominio/tipos-de-documento.js';
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

async function crear(cambios: Record<string, unknown> = {}) {
  const documentoId = await crearDocumentoDeLibro(contexto(), e.proveedorA);
  const [fila] = await insertar(documentoValido(e, documentoId, cambios));
  return fila!;
}

async function restriccionDe(cambios: Record<string, unknown>): Promise<string | undefined> {
  const documentoId = await crearDocumentoDeLibro(contexto(), e.proveedorA);
  return (await errorDePostgres(insertar(documentoValido(e, documentoId, cambios))))?.constraint;
}

let secuencia = 0;

/** Un saldo inicial (sin documento en el libro) del tipo dado. */
function saldoInicial(tipo: TipoDeDocumento, cambios: Record<string, unknown> = {}): typeof documentos.$inferInsert {
  secuencia += 1;
  return {
    empresaId: e.empresaA1,
    origen: 'saldo_inicial',
    serie: 'S',
    numero: `ANT${secuencia}`,
    tipo,
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

const crearSaldoInicial = async () => (await insertar(saldoInicial('factura')))[0]!;

const NOTA_DE_CREDITO = { tipo: 'nota_de_credito', vencimiento: null };

beforeAll(async () => {
  e = await prepararEscenario('cuentasporpagarfacturaanterior');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('la nota apunta al id propio de su factura', () => {
  it('acepta una nota sobre una factura del libro, por el id propio', async () => {
    const factura = await crear();

    const nota = await crear({ ...NOTA_DE_CREDITO, documentoAfectadoId: factura.id });

    expect(nota).toMatchObject({ documentoAfectadoId: factura.id, facturaDelSistemaAnterior: false });
  });

  it('acepta una nota de débito sobre un saldo inicial y rechaza un id que no existe o de otro proveedor', async () => {
    const saldo = await crearSaldoInicial();

    await expect(crear({ tipo: 'nota_de_debito', documentoAfectadoId: saldo.id })).resolves.toBeTruthy();
    expect(await restriccionDe({ tipo: 'nota_de_debito', documentoAfectadoId: crypto.randomUUID() })).toBe(
      'documentos_factura_fk',
    );
    // Otro proveedor rompe dos llaves a la vez; PostgreSQL no garantiza cuál revisa primero.
    expect(['documentos_documento_fk', 'documentos_factura_fk']).toContain(
      await restriccionDe({ tipo: 'nota_de_debito', documentoAfectadoId: saldo.id, proveedorId: e.proveedorA2 }),
    );
  });
});

describe('factura del sistema anterior', () => {
  it('una nota del libro puede no tener factura propia si corrige una del sistema anterior', async () => {
    const nota = await crear({ ...NOTA_DE_CREDITO, facturaDelSistemaAnterior: true });

    expect(nota).toMatchObject({ documentoAfectadoId: null, facturaDelSistemaAnterior: true });
    expect(await restriccionDe({ ...NOTA_DE_CREDITO })).toBe('documentos_nota_con_factura');
  });

  it('una factura no lleva factura afectada, ni siquiera con la marca', async () => {
    const factura = await crear();

    expect(await restriccionDe({ documentoAfectadoId: factura.id })).toBe('documentos_nota_con_factura');
    expect(await restriccionDe({ facturaDelSistemaAnterior: true })).toBe('documentos_factura_anterior_solo_en_notas');
  });

  it('la marca puede ir con la factura anterior que sí está cargada como saldo inicial', async () => {
    const saldo = await crearSaldoInicial();

    const nota = await crear({
      tipo: 'nota_de_debito',
      documentoAfectadoId: saldo.id,
      facturaDelSistemaAnterior: true,
    });

    expect(nota.facturaDelSistemaAnterior).toBe(true);
  });

  it('un saldo inicial no lleva la marca', async () => {
    const error = await errorDePostgres(insertar(saldoInicial('nota_de_debito', { facturaDelSistemaAnterior: true })));

    expect(error?.constraint).toBe('documentos_factura_anterior_solo_en_notas');
  });
});

/** Corre las sentencias de la migración 0007 que cambian la llave, dentro de una transacción que se deshace. */
async function conLaMigracionAplicada(
  notaId: string,
  facturaDeLibroId: string,
  verificar: (conexion: pg.Client) => Promise<void>,
): Promise<void> {
  const ruta = new URL('../../migraciones/0007_u8l_notas_sobre_saldos_iniciales.sql', import.meta.url);
  const pasos = readFileSync(ruta, 'utf8').split('--> statement-breakpoint');
  const parte = (fragmento: string) => pasos.find((paso) => paso.includes(fragmento))!;
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    await conexion.query('begin');
    // Deja la nota como estaba antes: con el id de la factura en el libro y sin la llave nueva.
    await conexion.query('alter table cuentas_por_pagar.documentos drop constraint documentos_factura_fk');
    await conexion.query('update cuentas_por_pagar.documentos set documento_afectado_id = $2 where id = $1', [
      notaId,
      facturaDeLibroId,
    ]);

    await conexion.query(parte('UPDATE "cuentas_por_pagar"'));
    await conexion.query(parte('ADD CONSTRAINT "documentos_factura_fk"'));

    await verificar(conexion);
  } finally {
    await conexion.query('rollback');
    await conexion.end();
  }
}

const afectadoDe = async (conexion: pg.Client, id: string): Promise<string | null> => {
  const { rows } = await conexion.query(
    'select documento_afectado_id from cuentas_por_pagar.documentos where id = $1',
    [id],
  );
  return rows[0].documento_afectado_id;
};

describe('migración 0007: de id del libro a id propio', () => {
  it('la nota que apuntaba al documento del libro pasa a apuntar al id propio de la factura', async () => {
    const factura = await crear();
    const nota = await crear({ tipo: 'nota_de_debito', documentoAfectadoId: factura.id });

    await conLaMigracionAplicada(nota.id, factura.documentoId!, async (conexion) => {
      expect(await afectadoDe(conexion, nota.id)).toBe(factura.id);
    });
  });

  it('deja intactas las notas que ya apuntaban a un saldo inicial', async () => {
    const saldo = await crearSaldoInicial();
    const otraNota = await crear({ tipo: 'nota_de_debito', documentoAfectadoId: saldo.id });
    const factura = await crear();
    const nota = await crear({ tipo: 'nota_de_debito', documentoAfectadoId: factura.id });

    await conLaMigracionAplicada(nota.id, factura.documentoId!, async (conexion) => {
      expect(await afectadoDe(conexion, otraNota.id)).toBe(saldo.id);
    });
  });
});
