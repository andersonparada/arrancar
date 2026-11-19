/**
 * Prueba de integración contra PostgreSQL (base de pruebas): seguridad por empresa de los catálogos de Inventarios,
 * los únicos sin mayúsculas ni acentos, los `check`, las llaves compuestas con la empresa, las cascadas y la
 * auditoría permanente.
 */
import { eq } from 'drizzle-orm';
import pg, { DatabaseError } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import { bdPropietario } from '../../../core/base-datos/sembrado-de-prueba.soporte.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { articulos } from './articulos.tablas.js';
import { categorias } from './categorias.tablas.js';
import { conversiones } from './conversiones.tablas.js';
import { lotes } from './lotes.tablas.js';
import { unidades } from './unidades.tablas.js';

let usuarioId: string;
let cuentaA: string;
let empresaA1: string;
let empresaA2: string;
let libra: string;
let caja: string;
let categoriaA1: string;
let categoriaA2: string;
let articuloA1: string;

const en = (empresaId: string): ContextoEmpresa => ({ empresaId, cuentaId: cuentaA, usuarioId });
const enA1 = () => en(empresaA1);

/** El error de PostgreSQL de la causa: Drizzle envuelve el original en sus propias excepciones. */
async function errorDePostgres(operacion: Promise<unknown>): Promise<DatabaseError | undefined> {
  try {
    await operacion;
  } catch (error) {
    for (let actual = error; actual; actual = (actual as { cause?: unknown }).cause) {
      if (actual instanceof DatabaseError) return actual;
    }
  }
  return undefined;
}

async function comoPropietario<T extends pg.QueryResultRow>(sql: string): Promise<T[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    return (await conexion.query<T>(sql)).rows;
  } finally {
    await conexion.end();
  }
}

type Unidad = typeof unidades.$inferInsert;
type Articulo = typeof articulos.$inferInsert;

const unidad = (empresaId: string, cambios: Partial<Unidad> = {}): Unidad => ({
  empresaId,
  nombre: 'Libra',
  simbolo: 'lb',
  magnitud: 'masa',
  factorALaReferencia: '1',
  ...cambios,
});

const articulo = (empresaId: string, cambios: Partial<Articulo> = {}): Articulo => ({
  empresaId,
  codigo: 'ART-0001',
  nombre: 'Concentrado',
  categoriaId: categoriaA1,
  tipoDeInventario: 'mercaderia',
  unidadBaseId: libra,
  ...cambios,
});

const insertarUnidad = (valores: Unidad, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(unidades).values(valores).returning());

const insertarCategoria = (empresaId: string, nombre: string) =>
  enTransaccionSegura(en(empresaId), (tx) =>
    tx.insert(categorias).values({ empresaId, nombre, tipoDeInventarioPorOmision: 'suministros' }).returning(),
  );

const insertarArticulo = (valores: Articulo, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(articulos).values(valores).returning());

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await comoPropietario('truncate core.cuentas, core.usuarios cascade');
  const [cuenta] = await bd.insert(cuentas).values({ nombre: 'Cuenta A' }).returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'inventariosuno', nombres: 'Inventarios', hashContrasena: 'x' })
    .returning();
  const filas = await bdPropietario
    .insert(empresas)
    .values([
      { cuentaId: cuenta!.id, nombre: 'Empresa A1' },
      { cuentaId: cuenta!.id, nombre: 'Empresa A2' },
    ])
    .returning();
  usuarioId = usuario!.id;
  cuentaA = cuenta!.id;
  [empresaA1, empresaA2] = filas.map((fila) => fila.id) as [string, string];
  libra = (await insertarUnidad(unidad(empresaA1)))[0]!.id;
  caja = (
    await insertarUnidad(
      unidad(empresaA1, { nombre: 'Caja', simbolo: 'caja', magnitud: 'empaque', factorALaReferencia: null }),
    )
  )[0]!.id;
  categoriaA1 = (await insertarCategoria(empresaA1, 'Alimentos'))[0]!.id;
  categoriaA2 = (await insertarCategoria(empresaA2, 'Alimentos'))[0]!.id;
  articuloA1 = (await insertarArticulo(articulo(empresaA1)))[0]!.id;
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('catálogos de Inventarios: seguridad por empresa', () => {
  it('cada empresa ve solo lo suyo, aunque sea de la misma cuenta', async () => {
    const visibles = (empresaId: string) =>
      enTransaccionSegura(en(empresaId), async (tx) => ({
        unidades: await tx.select().from(unidades),
        articulos: await tx.select().from(articulos),
        categorias: await tx.select().from(categorias),
      }));

    const a1 = await visibles(empresaA1);
    const a2 = await visibles(empresaA2);

    expect([a1.unidades.length, a1.articulos.length, a1.categorias.length]).toEqual([2, 1, 1]);
    expect([a2.unidades.length, a2.articulos.length, a2.categorias.length]).toEqual([0, 0, 1]);
  });

  it('no se puede escribir a nombre de otra empresa', async () => {
    await expect(insertarUnidad(unidad(empresaA2, { nombre: 'Intrusa', simbolo: 'x' }), enA1())).rejects.toThrow();
  });
});

describe('unidades de medida: únicos y checks', () => {
  it('el nombre y el símbolo no se repiten en la empresa (sin mayúsculas ni acentos)', async () => {
    const nombre = await errorDePostgres(insertarUnidad(unidad(empresaA1, { nombre: ' LIBRA ', simbolo: 'otra' })));
    const simbolo = await errorDePostgres(insertarUnidad(unidad(empresaA1, { nombre: 'Otra', simbolo: 'LB' })));

    expect(nombre?.constraint).toBe('unidades_nombre_unico');
    expect(simbolo?.constraint).toBe('unidades_simbolo_unico');
    await expect(insertarUnidad(unidad(empresaA2), en(empresaA2))).resolves.toBeTruthy();
  });

  it.each([
    ['magnitud desconocida', { magnitud: 'tiempo' as never, factorALaReferencia: null }, 'unidades_magnitud'],
    ['masa sin factor', { factorALaReferencia: null }, 'unidades_factor_segun_magnitud'],
    ['empaque con factor', { magnitud: 'empaque', factorALaReferencia: '2' }, 'unidades_factor_segun_magnitud'],
    ['factor en cero', { factorALaReferencia: '0' }, 'unidades_factor_positivo'],
    ['nombre de más de 40 letras', { factorALaReferencia: '1', nombre: 'x'.repeat(41) }, 'unidades_nombre_largo'],
    ['símbolo de más de 10 letras', { factorALaReferencia: '1', simbolo: 'x'.repeat(11) }, 'unidades_simbolo_largo'],
  ] as const)('rechaza %s (check)', async (_caso, cambios, restriccion) => {
    const error = await errorDePostgres(
      insertarUnidad(unidad(empresaA1, { nombre: 'Prueba', simbolo: 'pr', ...(cambios as Partial<Unidad>) })),
    );

    expect(error?.constraint).toBe(restriccion);
  });
});

describe('artículos: únicos, checks y llaves compuestas', () => {
  it('el código (sin distinguir mayúsculas), el nombre y el código de barras no se repiten', async () => {
    const codigo = await errorDePostgres(insertarArticulo(articulo(empresaA1, { codigo: 'art-0001', nombre: 'Otro' })));
    const nombre = await errorDePostgres(
      insertarArticulo(articulo(empresaA1, { codigo: 'ART-2', nombre: 'CONCENTRADO' })),
    );

    expect(codigo?.constraint).toBe('articulos_codigo_unico');
    expect(nombre?.constraint).toBe('articulos_nombre_unico');
  });

  it('varios artículos sin código de barras conviven; con el mismo código de barras, no', async () => {
    await insertarArticulo(articulo(empresaA1, { codigo: 'ART-3', nombre: 'Sin barras 1' }));
    await insertarArticulo(articulo(empresaA1, { codigo: 'ART-4', nombre: 'Sin barras 2' }));
    await insertarArticulo(articulo(empresaA1, { codigo: 'ART-5', nombre: 'Con barras', codigoDeBarras: '7401234' }));

    const repetido = await errorDePostgres(
      insertarArticulo(articulo(empresaA1, { codigo: 'ART-6', nombre: 'Otro con barras', codigoDeBarras: '7401234' })),
    );

    expect(repetido?.constraint).toBe('articulos_codigo_de_barras_unico');
  });

  it.each([
    ['código con espacios', { codigo: 'ART 7' }, 'articulos_codigo_forma'],
    ['tipo de inventario desconocido', { tipoDeInventario: 'joyas' as never }, 'articulos_tipo_de_inventario'],
    ['vencimiento sin lotes', { manejaVencimiento: true, manejaLotes: false }, 'articulos_vencimiento_con_lotes'],
    ['existencia mínima negativa', { existenciaMinima: '-1' }, 'articulos_existencia_minima'],
    ['peso en cero', { pesoKgPorUnidadBase: '0' }, 'articulos_peso_positivo'],
  ] as const)('rechaza %s (check)', async (_caso, cambios, restriccion) => {
    const error = await errorDePostgres(
      insertarArticulo(articulo(empresaA1, { codigo: 'ART-8', nombre: 'Prueba', ...(cambios as Partial<Articulo>) })),
    );

    expect(error?.constraint).toBe(restriccion);
  });

  it('no se puede usar la categoría de otra empresa (llave compuesta)', async () => {
    const error = await errorDePostgres(
      insertarArticulo(articulo(empresaA1, { codigo: 'ART-9', nombre: 'Ajeno', categoriaId: categoriaA2 })),
    );

    expect(error?.constraint).toBe('articulos_categoria_fk');
  });

  it('una unidad o categoría con artículos no se elimina', async () => {
    const unidadEnUso = enTransaccionSegura(enA1(), (tx) => tx.delete(unidades).where(eq(unidades.id, libra)));
    const categoriaEnUso = enTransaccionSegura(enA1(), (tx) =>
      tx.delete(categorias).where(eq(categorias.id, categoriaA1)),
    );

    expect((await errorDePostgres(unidadEnUso))?.code).toBe('23503');
    expect((await errorDePostgres(categoriaEnUso))?.code).toBe('23503');
  });
});

describe('conversiones y lotes', () => {
  const convertir = (cambios: Partial<typeof conversiones.$inferInsert> = {}) =>
    enTransaccionSegura(enA1(), (tx) =>
      tx
        .insert(conversiones)
        .values({ empresaId: empresaA1, articuloId: articuloA1, unidadId: caja, factor: '24', ...cambios }),
    );

  it('una conversión por unidad y una sola «para compras» por artículo', async () => {
    await convertir({ paraCompras: true });
    const repetida = await errorDePostgres(convertir());
    const otraDeCompras = await errorDePostgres(convertir({ unidadId: libra, paraCompras: true }));

    expect(repetida?.constraint).toBe('conversiones_pk');
    expect(otraDeCompras?.constraint).toBe('conversiones_para_compras_unica');
  });

  it('el factor es mayor que cero', async () => {
    await enTransaccionSegura(enA1(), (tx) => tx.delete(conversiones));

    const error = await errorDePostgres(convertir({ factor: '0' }));

    expect(error?.constraint).toBe('conversiones_factor_positivo');
  });

  it('el código del lote no se repite en el artículo y los lotes se van con él', async () => {
    const lote = (codigo: string) =>
      enTransaccionSegura(enA1(), (tx) =>
        tx.insert(lotes).values({ empresaId: empresaA1, articuloId: articuloA1, codigo }),
      );
    await lote('L-1');

    const repetido = await errorDePostgres(lote('l-1'));

    expect(repetido?.constraint).toBe('lotes_codigo_unico');
    await convertir();
    await enTransaccionSegura(enA1(), (tx) => tx.delete(articulos).where(eq(articulos.id, articuloA1)));
    const quedan = await enTransaccionSegura(enA1(), async (tx) => ({
      lotes: await tx.select().from(lotes),
      conversiones: await tx.select().from(conversiones),
    }));
    expect(quedan).toEqual({ lotes: [], conversiones: [] });
  });
});

describe('migraciones de datos', () => {
  it('la auditoría permanente de los tres recursos del diseño cita la ley', async () => {
    const filas = await comoPropietario<{ recurso: string; motivo: string }>(
      "select recurso, motivo from core.recursos_de_auditoria_permanente where recurso like 'inventarios.%' order by recurso",
    );

    expect(filas.map((fila) => fila.recurso)).toEqual([
      'inventarios.ajustes',
      'inventarios.cierres',
      'inventarios.metodos-de-costeo',
    ]);
    expect(filas.map((fila) => fila.motivo).join(' ')).toContain('art. 41');
    expect(filas.map((fila) => fila.motivo).join(' ')).toContain('arts. 47 y 112');
  });

  it('el índice de búsqueda por nombre de los artículos existe', async () => {
    const filas = await comoPropietario(
      "select indexname from pg_indexes where indexname = 'articulos_nombre_trgm_idx'",
    );

    expect(filas).toHaveLength(1);
  });
});
