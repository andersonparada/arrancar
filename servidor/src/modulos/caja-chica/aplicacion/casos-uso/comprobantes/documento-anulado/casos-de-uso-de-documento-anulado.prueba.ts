import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { DocumentoParaDestino } from '../../../../../core/contratos/libro-de-compras.contratos.js';
import { AnularPorAviso } from '../atender-avisos-del-libro.js';
import { armarEscenario, FONDO_ID, HOY, type EscenarioEnMemoria } from '../dobles-de-comprobantes.soporte.js';
import { RecibirDocumento } from '../recibir-documento.js';
import { PonerEnDisputa, QuitarDeDisputa } from './disputa-del-documento-anulado.js';
import { ReemplazarDocumentoAnulado } from './reemplazar-documento-anulado.js';
import { ResolverDocumentoAnulado } from './resolver-documento-anulado.js';

const operador = operadorDePrueba();
let m: EscenarioEnMemoria;
let procesados: Array<[string, boolean]>;

const documento = (cambios: Partial<DocumentoParaDestino> = {}): DocumentoParaDestino => ({
  documentoId: crypto.randomUUID(),
  tipo: 'factura',
  proveedorId: 'proveedor-1',
  documentoAfectadoId: null,
  fechaEmision: HOY,
  totalCentavos: 30_000,
  retencionesCentavos: 0,
  tieneActivoFijo: false,
  ...cambios,
});

/** Un documento recibido (en el fondo o, sin `referenciaDeDestino`, en la bandeja). */
async function recibido(cambios: Partial<DocumentoParaDestino> = {}) {
  const dato = documento(cambios);
  await new RecibirDocumento(m.dependencias).ejecutar(operador, dato);
  const comprobante = [...m.comprobantes.filas.values()].find((c) => c.documentoDeCompraId === dato.documentoId)!;
  return { documentoId: dato.documentoId, id: comprobante.id };
}

/** Una factura en el fondo cuya FEL el emisor ya anuló: por resolver. */
async function porResolver() {
  const factura = await recibido({ referenciaDeDestino: FONDO_ID });
  await new AnularPorAviso(m.dependencias).ejecutar(operador, {
    documentoId: factura.documentoId,
    destino: 'caja-chica',
    motivo: 'El emisor anuló la FEL',
    causa: 'fel_anulada_por_el_emisor',
  });
  m.publicador.publicados.length = 0;
  m.auditoria.entradas.length = 0;
  return factura;
}

beforeEach(async () => {
  m = await armarEscenario(1_000_000);
  procesados = [];
  m.publicador.publicados.length = 0;
});

const reemplazar = () =>
  new ReemplazarDocumentoAnulado(m.dependencias, {
    marcarProcesado: async (_operador, documentoId, procesado) => {
      procesados.push([documentoId, procesado]);
    },
  });

describe('la FEL anulada por el emisor al anular en el libro', () => {
  it('con el comprobante en un fondo queda por resolver, vigente, sin evento y auditado `corregir`', async () => {
    const { id, documentoId } = await recibido({ referenciaDeDestino: FONDO_ID });
    m.publicador.publicados.length = 0;
    m.auditoria.entradas.length = 0;

    await new AnularPorAviso(m.dependencias).ejecutar(operador, {
      documentoId,
      destino: 'caja-chica',
      causa: 'fel_anulada_por_el_emisor',
    });

    expect(m.comprobantes.filas.get(id)).toMatchObject({
      estado: 'vigente',
      seguimiento: { situacion: 'por_resolver' },
    });
    expect(m.auditoria.entradas).toMatchObject([{ accion: 'corregir', registroId: id }]);
    expect(m.publicador.nombres()).toEqual([]);
  });

  it('con el comprobante en la bandeja se anula como siempre', async () => {
    const { id, documentoId } = await recibido();

    await new AnularPorAviso(m.dependencias).ejecutar(operador, {
      documentoId,
      destino: 'caja-chica',
      causa: 'fel_anulada_por_el_emisor',
    });

    expect(m.comprobantes.filas.get(id)).toMatchObject({ estado: 'anulado', seguimiento: null });
  });
});

describe('resolver un documento anulado', () => {
  it('sin recuperación lo deja resuelto, audita `ajustar` y publica `documento_anulado_resuelto`', async () => {
    const { id } = await porResolver();

    await new ResolverDocumentoAnulado(m.dependencias).ejecutar(operador, {
      comprobanteId: id,
      salida: 'sin_recuperacion',
      motivo: 'El proveedor cerró',
    });

    expect(m.comprobantes.filas.get(id)!.seguimiento).toMatchObject({
      situacion: 'resuelto',
      salida: 'sin_recuperacion',
    });
    expect(m.auditoria.entradas).toMatchObject([{ accion: 'ajustar', registroId: id }]);
    expect(m.publicador.nombres()).toEqual(['caja-chica.documento_anulado_resuelto']);
  });

  it('la devolución guarda el monto en centavos y su destino; ya resuelto no se resuelve otra vez', async () => {
    const { id } = await porResolver();
    const caso = new ResolverDocumentoAnulado(m.dependencias);

    await caso.ejecutar(operador, {
      comprobanteId: id,
      salida: 'devolucion',
      motivo: 'Devolvió',
      monto: '100.50',
      destino: 'proveedor',
    });

    expect(m.comprobantes.filas.get(id)!.seguimiento).toMatchObject({ montoCentavos: 10_050, destino: 'proveedor' });
    await expect(
      caso.ejecutar(operador, { comprobanteId: id, salida: 'sin_recuperacion', motivo: 'Otra vez' }),
    ).rejects.toMatchObject({ codigo: 'situacion_del_documento_no_permite' });
  });

  it('un comprobante sin documento anulado no se resuelve y uno que no existe tampoco', async () => {
    const { id } = await recibido({ referenciaDeDestino: FONDO_ID });
    const caso = new ResolverDocumentoAnulado(m.dependencias);

    await expect(
      caso.ejecutar(operador, { comprobanteId: id, salida: 'sin_recuperacion', motivo: 'x' }),
    ).rejects.toMatchObject({ codigo: 'comprobante_sin_documento_anulado' });
    await expect(
      caso.ejecutar(operador, { comprobanteId: 'no-existe', salida: 'sin_recuperacion', motivo: 'x' }),
    ).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});

describe('la disputa', () => {
  it('pasa a disputa con la fecha límite a dos meses y se retira; auditado `corregir` las dos veces', async () => {
    const { id } = await porResolver();

    await new PonerEnDisputa(m.dependencias).ejecutar(operador, {
      comprobanteId: id,
      motivo: 'Sí pagamos',
      prueba: 'Cheque 55',
    });

    expect(m.comprobantes.filas.get(id)!.seguimiento).toMatchObject({
      situacion: 'en_disputa',
      disputa: { prueba: 'Cheque 55', hasta: '2027-01-18' },
    });
    await new QuitarDeDisputa(m.dependencias).ejecutar(operador, { comprobanteId: id, motivo: 'Se confirmó' });
    expect(m.comprobantes.filas.get(id)!.seguimiento).toMatchObject({ situacion: 'por_resolver', disputa: null });
    expect(m.auditoria.entradas.map(({ accion }) => accion)).toEqual(['corregir', 'corregir']);
  });
});

describe('reemplazar el documento anulado', () => {
  it('apunta al documento nuevo, quita el de la bandeja con su auditoría y publica el evento', async () => {
    const anulado = await porResolver();
    const nuevo = await recibido();

    await reemplazar().ejecutar(operador, { comprobanteId: anulado.id, reemplazoId: nuevo.id, motivo: 'FEL nueva' });

    expect(m.comprobantes.filas.get(anulado.id)).toMatchObject({
      documentoDeCompraId: nuevo.documentoId,
      seguimiento: { situacion: 'resuelto', salida: 'reemplazo', documentoAnuladoId: anulado.documentoId },
    });
    expect(m.comprobantes.filas.has(nuevo.id)).toBe(false);
    expect(m.auditoria.entradas.map(({ accion }) => accion)).toEqual(['eliminar', 'corregir']);
    expect(m.publicador.nombres()).toEqual(['caja-chica.documento_anulado_resuelto']);
    expect(procesados).toEqual([]);
  });

  it('si el comprobante ya estaba repuesto marca la FEL nueva como procesada', async () => {
    const anulado = await porResolver();
    m.comprobantes.filas.set(anulado.id, { ...m.comprobantes.filas.get(anulado.id)!, reposicionNumero: 3 });
    const nuevo = await recibido();

    await reemplazar().ejecutar(operador, { comprobanteId: anulado.id, reemplazoId: nuevo.id, motivo: 'FEL nueva' });

    expect(procesados).toEqual([[nuevo.documentoId, true]]);
  });

  it('el rechazo por otro monto no manda a una devolución o cobro que dejaría la FEL suelta', async () => {
    const anulado = await porResolver();
    const otroMonto = await recibido({ totalCentavos: 25_000 });

    const error = await reemplazar()
      .ejecutar(operador, { comprobanteId: anulado.id, reemplazoId: otroMonto.id, motivo: 'x' })
      .catch((e: Error) => e);

    expect(error).toMatchObject({ codigo: 'reemplazo_no_valido' });
    expect((error as Error).message).not.toMatch(/devoluci|cobro/i);
  });

  it('rechaza otro monto, otro proveedor, uno ya asignado y uno fuera del libro', async () => {
    const anulado = await porResolver();
    const otroMonto = await recibido({ totalCentavos: 25_000 });
    const otroProveedor = await recibido({ proveedorId: 'proveedor-2' });
    const asignado = await recibido({ referenciaDeDestino: FONDO_ID });
    m.comprobantes.enElLibro = false;
    const fueraDelLibro = await recibido();

    for (const reemplazo of [otroMonto, otroProveedor, asignado, fueraDelLibro]) {
      await expect(
        reemplazar().ejecutar(operador, { comprobanteId: anulado.id, reemplazoId: reemplazo.id, motivo: 'x' }),
      ).rejects.toMatchObject({ codigo: 'reemplazo_no_valido' });
    }
    expect(m.comprobantes.filas.get(anulado.id)!.seguimiento).toMatchObject({ situacion: 'por_resolver' });
  });
});
