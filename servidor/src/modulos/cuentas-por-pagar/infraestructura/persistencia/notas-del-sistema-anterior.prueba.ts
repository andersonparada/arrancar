/**
 * Prueba de integración contra PostgreSQL de lo que U8l-3 lee y busca en SQL: el saldo inicial de la factura que cita una
 * nota, las notas libres del sistema anterior (con su saldo libre), la factura anterior de la ficha y el conteo del cuadre.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { documentos as documentosDeCompra } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { facturasAnteriores } from '../../../libro-de-compras/infraestructura/persistencia/facturas-anteriores.tablas.js';
import type { TipoDeDocumento } from '../../dominio/tipos-de-documento.js';
import { ConsultasDeCuadreDrizzle } from './cuadre-de-saldos-iniciales.drizzle.js';
import { facturaAnteriorDeLaNota, notasLibresDelSistemaAnterior } from './consultas-del-sistema-anterior.drizzle.js';
import { aplicacionesDeNotas } from './aplicaciones-de-notas.tablas.js';
import { documentos } from './documentos.tablas.js';
import { contextoDe, prepararEscenario, type Escenario } from './escenario.soporte.js';
import { RepositorioDeAplicacionesDrizzle } from './repositorio-de-aplicaciones.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from './repositorio-de-documentos.drizzle.js';

let e: Escenario;
let secuencia = 0;
const contexto = () => contextoDe(e, e.empresaA1, e.cuentaA);
const enContexto = <T>(consulta: () => Promise<T>) => enTransaccionSegura(contexto(), () => consulta());
const repositorio = () => new RepositorioDeDocumentosDrizzle(new RepositorioDeAplicacionesDrizzle());

async function saldoInicial(cambios: Partial<typeof documentos.$inferInsert> = {}) {
  secuencia += 1;
  const [fila] = await enTransaccionSegura(contexto(), (tx) =>
    tx
      .insert(documentos)
      .values({
        empresaId: e.empresaA1,
        origen: 'saldo_inicial',
        serie: 'S',
        numero: `ANT${secuencia}`,
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
      })
      .returning(),
  );
  return fila!;
}

const anteriores = new Map<string, string>();

/** La fila de la factura anterior en el libro, una por factura aunque la citen varias notas. */
async function facturaAnterior(serie: string | null, numero: string) {
  const clave = `${serie}-${numero}`;
  if (anteriores.has(clave)) return anteriores.get(clave)!;
  const [fila] = await enTransaccionSegura(contexto(), (tx) =>
    tx
      .insert(facturasAnteriores)
      .values({
        empresaId: e.empresaA1,
        proveedorId: e.proveedorA,
        tipo: 'factura',
        serie,
        numero,
        fechaEmision: '2025-12-20',
        total: '1120',
        iva: '120',
      })
      .returning(),
  );
  anteriores.set(clave, fila!.id);
  return fila!.id;
}

/** Una nota del libro que cita la factura anterior y su copia en Cuentas por pagar (libre salvo que se enlace). */
async function notaQueCita(
  factura: { serie: string; numero: string },
  cambios: Partial<typeof documentos.$inferInsert> = {},
) {
  secuencia += 1;
  const facturaAnteriorId = await facturaAnterior(factura.serie, factura.numero);
  const tipo = (cambios.tipo ?? 'nota_de_credito') as TipoDeDocumento;
  const [libro] = await enTransaccionSegura(contexto(), (tx) =>
    tx
      .insert(documentosDeCompra)
      .values({
        empresaId: e.empresaA1,
        tipo,
        proveedorId: e.proveedorA,
        nitEmisor: '1234567',
        nombreEmisor: 'Proveedor A',
        serie: 'N',
        numero: `NOTA${secuencia}`,
        autorizacionFel: crypto.randomUUID(),
        tipoDte: tipo === 'nota_de_credito' ? 'NCRE' : 'NDEB',
        fechaEmision: '2026-04-10',
        fechaRecepcion: '2026-04-12',
        periodo: '2026-04-01',
        destino: 'cuentas-por-pagar',
        regimenIvaDeLaEmpresa: 'general',
        total: '100',
        base: '89.29',
        iva: '10.71',
        ivaNoAcreditable: '0',
        idp: '0',
        exento: '0',
        facturaAnteriorId,
      })
      .returning(),
  );
  const [nota] = await enTransaccionSegura(contexto(), (tx) =>
    tx
      .insert(documentos)
      .values({
        empresaId: e.empresaA1,
        documentoId: libro!.id,
        serie: 'N',
        numero: `NOTA${secuencia}`,
        tipo,
        proveedorId: e.proveedorA,
        facturaDelSistemaAnterior: true,
        fechaEmision: '2026-04-10',
        total: '100',
        vencimiento: tipo === 'nota_de_credito' ? null : '2026-05-10',
        ...cambios,
      })
      .returning(),
  );
  return nota!;
}

beforeAll(async () => {
  e = await prepararEscenario('notasdelsistemaanterior');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('buscar el saldo inicial de la factura que cita una nota', () => {
  it('lo encuentra por proveedor, serie y número, y los seis tipos de factura cuentan como uno', async () => {
    const saldo = await saldoInicial({ tipo: 'factura_pequeno_contribuyente', serie: 'PC', numero: 'FAMILIA1' });

    const encontrado = await enContexto(() =>
      repositorio().buscarSaldoInicialDeLaFactura({ proveedorId: e.proveedorA, serie: 'PC', numero: 'FAMILIA1' }),
    );

    expect(encontrado?.id).toBe(saldo.id);
  });

  it('sin serie solo encuentra el saldo sin serie, y no encuentra el de otro proveedor', async () => {
    const sinSerie = await saldoInicial({ serie: null, numero: 'SINSERIE1' });
    const buscar = (proveedorId: string, serie: string | null, numero: string) =>
      enContexto(() => repositorio().buscarSaldoInicialDeLaFactura({ proveedorId, serie, numero }));

    expect((await buscar(e.proveedorA, null, 'SINSERIE1'))?.id).toBe(sinSerie.id);
    expect(await buscar(e.proveedorA, 'S', 'SINSERIE1')).toBeNull();
    expect(await buscar(e.proveedorA2, null, 'SINSERIE1')).toBeNull();
  });

  it('una nota de crédito o un recibo guardados como saldo inicial no cuentan como factura', async () => {
    await saldoInicial({ tipo: 'recibo', serie: 'R', numero: 'RECIBO1', vencimiento: '2026-01-20' });

    const encontrado = await enContexto(() =>
      repositorio().buscarSaldoInicialDeLaFactura({ proveedorId: e.proveedorA, serie: 'R', numero: 'RECIBO1' }),
    );

    expect(encontrado).toBeNull();
  });
});

describe('notas libres del sistema anterior', () => {
  it('trae las notas sin saldo inicial con la factura que citan y lo que de ellas sigue libre', async () => {
    const nota = await notaQueCita({ serie: 'LIB', numero: 'A1' });
    const debito = await notaQueCita({ serie: 'LIB', numero: 'A1' }, { tipo: 'nota_de_debito' });

    const libres = await enContexto(notasLibresDelSistemaAnterior);

    expect(libres).toEqual(
      expect.arrayContaining([
        { proveedorId: e.proveedorA, tipo: 'nota_de_credito', serie: 'LIB', numero: 'A1', saldoLibreCentavos: 10000 },
        { proveedorId: e.proveedorA, tipo: 'nota_de_debito', serie: 'LIB', numero: 'A1', saldoLibreCentavos: 0 },
      ]),
    );
    expect([nota.id, debito.id]).toHaveLength(2);
  });

  it('una aplicación a mano baja el saldo libre; las anuladas y las enlazadas no aparecen', async () => {
    const cargo = await saldoInicial({ numero: 'CARGO1' });
    const parcial = await notaQueCita({ serie: 'LIB', numero: 'B1' });
    await notaQueCita(
      { serie: 'LIB', numero: 'B2' },
      {
        estado: 'anulado',
        anuladoEn: new Date(),
        anuladoPor: e.usuarioId,
        motivoDeAnulacion: 'Prueba',
        estabaAutorizado: false,
      },
    );
    await notaQueCita({ serie: 'LIB', numero: 'B3' }, { documentoAfectadoId: cargo.id });
    await enTransaccionSegura(contexto(), (tx) =>
      tx.insert(aplicacionesDeNotas).values({
        empresaId: e.empresaA1,
        proveedorId: e.proveedorA,
        notaId: parcial.id,
        cargoId: cargo.id,
        monto: '40',
        forma: 'manual',
        fecha: '2026-04-20',
        referencia: 'Acuerdo',
      }),
    );

    const libres = await enContexto(notasLibresDelSistemaAnterior);

    expect(libres.filter(({ numero }) => numero === 'B1').map((n) => n.saldoLibreCentavos)).toEqual([6000]);
    expect(libres.some(({ numero }) => numero === 'B2' || numero === 'B3')).toBe(false);
  });

  it('la ficha de la nota lee su factura anterior del libro', async () => {
    const nota = await notaQueCita({ serie: 'FIC', numero: 'F1' });

    const factura = await enContexto(() => facturaAnteriorDeLaNota(nota.documentoId!));

    expect(factura).toEqual({ tipo: 'factura', serie: 'FIC', numero: 'F1', fechaEmision: '2025-12-20' });
    expect(await enContexto(() => facturaAnteriorDeLaNota(crypto.randomUUID()))).toBeNull();
  });
});

describe('cuadre: saldos con notas posteriores', () => {
  it('cuenta por proveedor los saldos iniciales vigentes cuya factura citan notas libres', async () => {
    await saldoInicial({ serie: 'CUA', numero: 'C1' });
    await notaQueCita({ serie: 'CUA', numero: 'C1' });
    await notaQueCita({ serie: 'CUA', numero: 'C1' }, { tipo: 'nota_de_debito' });
    await saldoInicial({ serie: 'CUA', numero: 'C2' });

    const conNotas = await enContexto(() => new ConsultasDeCuadreDrizzle().saldosConNotasPosteriores());

    expect(conNotas.get(e.proveedorA)).toBeGreaterThanOrEqual(1);
    const cuantos = conNotas.get(e.proveedorA)!;
    await saldoInicial({ serie: 'CUA', numero: 'C3' });
    await notaQueCita({ serie: 'CUA', numero: 'C3' });
    const despues = await enContexto(() => new ConsultasDeCuadreDrizzle().saldosConNotasPosteriores());
    expect(despues.get(e.proveedorA)).toBe(cuantos + 1);
    expect(despues.get(e.proveedorA2)).toBeUndefined();
  });
});
