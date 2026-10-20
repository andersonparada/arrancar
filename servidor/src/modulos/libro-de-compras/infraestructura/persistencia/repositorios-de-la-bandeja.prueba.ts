/** Prueba de integración contra PostgreSQL: los repositorios de lotes y de filas de la bandeja de DTE. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { DteRecibido, type DatosDelDte } from '../../dominio/dte-recibido.js';
import type { LoteDeDte } from '../../dominio/lote-de-dte.js';
import {
  contextoDe,
  documentoValido,
  insertarDocumento,
  prepararEscenario,
  type Escenario,
} from './documentos.soporte.js';
import { RepositorioDeDteRecibidosDrizzle } from './repositorio-de-dte-recibidos.drizzle.js';
import { RepositorioDeLotesDeDteDrizzle } from './repositorio-de-lotes-de-dte.drizzle.js';

let e: Escenario;

const enA1 = () => contextoDe(e, e.empresaA1, e.cuentaA);
const enA2 = () => contextoDe(e, e.empresaA2, e.cuentaA);
const lotes = new RepositorioDeLotesDeDteDrizzle();
const filas = new RepositorioDeDteRecibidosDrizzle();

const unLote = (cambios: Partial<LoteDeDte> = {}): LoteDeDte => ({
  id: crypto.randomUUID(),
  empresaId: e.empresaA1,
  proposito: 'bandeja',
  formato: 'csv',
  nombreDelArchivo: 'recibidos.csv',
  sha256: 'ab'.repeat(32),
  tamanoEnBytes: 100,
  versionDelMapa: '1',
  emisionDesde: '2026-03-01',
  emisionHasta: '2026-03-31',
  filasLeidas: 2,
  filasNuevas: 1,
  filasActualizadas: 0,
  filasSinCambio: 0,
  filasRechazadas: 1,
  anuladasEnLaSat: 0,
  rechazos: [{ fila: 3, autorizacion: null, motivo: 'moneda', detalle: 'USD' }],
  encabezadosNoReconocidos: ['Columna nueva'],
  resumenDeConciliacion: null,
  ...cambios,
});

const datos = (): DatosDelDte => ({
  autorizacionFel: crypto.randomUUID(),
  tipoDte: 'FACT',
  serie: 'A',
  numero: 'R1',
  fechaEmision: '2026-03-10',
  nitEmisor: '1234567',
  nombreEmisor: 'Proveedor',
  nitReceptor: '7654321',
  total: '112.00',
  iva: '12.00',
  idp: '0.00',
  otrosImpuestos: '0.00',
  otrosImpuestosDetalle: { 'TURISMO HOSPEDAJE': '0' },
  filaOriginal: { Serie: 'A' },
  estadoSat: 'vigente',
  anuladoEnLaSatEl: null,
});

const nuevaFila = (loteId: string) =>
  DteRecibido.crear({ empresaId: Identificador.desde<'Empresa'>(e.empresaA1), loteId, datos: datos() });

beforeAll(async () => {
  e = await prepararEscenario('repositoriosbandeja');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('RepositorioDeLotesDeDteDrizzle', () => {
  it('guarda un lote y lo encuentra por su huella, con sus listas', async () => {
    const lote = unLote();
    await enTransaccionSegura(enA1(), () => lotes.agregar(lote));

    const encontrado = await enTransaccionSegura(enA1(), () => lotes.buscarPorSha256(lote.sha256));

    expect(encontrado).toEqual(lote);
  });

  it('otra empresa no encuentra la huella', async () => {
    const lote = unLote({ sha256: 'cd'.repeat(32) });
    await enTransaccionSegura(enA1(), () => lotes.agregar(lote));

    expect(await enTransaccionSegura(enA2(), () => lotes.buscarPorSha256(lote.sha256))).toBeNull();
  });
});

describe('RepositorioDeDteRecibidosDrizzle', () => {
  const guardarNueva = async () => {
    const lote = unLote({ sha256: crypto.randomUUID().replaceAll('-', '').repeat(2) });
    const fila = nuevaFila(lote.id);
    await enTransaccionSegura(enA1(), async () => {
      await lotes.agregar(lote);
      await filas.agregar(fila);
    });
    return fila;
  };

  it('guarda una fila y la encuentra por id, autorización y documento', async () => {
    const fila = await guardarNueva();
    const documentoId = await insertarDocumento(documentoValido(e), enA1());
    fila.registrar(documentoId);
    await enTransaccionSegura(enA1(), () => filas.guardar(fila));

    const [porId, porAutorizacion, porDocumento] = await enTransaccionSegura(enA1(), () =>
      Promise.all([
        filas.buscar(fila.id),
        filas.buscarPorAutorizacion(fila.instantanea().autorizacionFel),
        filas.buscarPorDocumento(documentoId),
      ]),
    );

    expect(porId?.instantanea()).toEqual(fila.instantanea());
    expect(porAutorizacion?.id.valor).toBe(fila.id.valor);
    expect(porDocumento?.estado).toBe('registrado');
  });

  it('guarda el descarte y la vuelta a pendiente sin tocar los datos de la SAT', async () => {
    const fila = await guardarNueva();
    fila.descartar({ motivo: 'No es nuestra', por: e.usuarioId, en: new Date('2026-03-11T10:00:00Z') });
    await enTransaccionSegura(enA1(), () => filas.guardar(fila));
    const descartada = await enTransaccionSegura(enA1(), () => filas.buscar(fila.id));
    const estadoDescartado = descartada!.instantanea();

    descartada!.devolverAPendiente();
    await enTransaccionSegura(enA1(), () => filas.guardar(descartada!));
    const restaurada = await enTransaccionSegura(enA1(), () => filas.buscar(fila.id));

    expect(estadoDescartado).toMatchObject({ estado: 'descartado', descartadoPor: e.usuarioId });
    expect(restaurada!.instantanea()).toMatchObject({ estado: 'pendiente', motivoDeDescarte: null });
    expect(restaurada!.instantanea().total).toBe('112.00');
  });

  it('otra empresa no ve la fila', async () => {
    const fila = await guardarNueva();

    expect(await enTransaccionSegura(enA2(), () => filas.buscar(fila.id))).toBeNull();
    expect(
      await enTransaccionSegura(enA2(), () => filas.buscarPorAutorizacion(fila.instantanea().autorizacionFel)),
    ).toBeNull();
  });
});
