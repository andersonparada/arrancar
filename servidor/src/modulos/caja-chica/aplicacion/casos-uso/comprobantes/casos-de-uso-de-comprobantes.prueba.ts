import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { DocumentoParaDestino } from '../../../../core/contratos/libro-de-compras.contratos.js';
import { armarEscenario, FONDO_ID, HOY, type EscenarioEnMemoria } from './dobles-de-comprobantes.soporte.js';
import { RecibirDocumento } from './recibir-documento.js';

const operador = operadorDePrueba();
let m: EscenarioEnMemoria;

const documento = (cambios: Partial<DocumentoParaDestino> = {}): DocumentoParaDestino => ({
  documentoId: crypto.randomUUID(),
  tipo: 'factura',
  proveedorId: 'proveedor-1',
  documentoAfectadoId: null,
  fechaEmision: HOY,
  totalCentavos: 112_000,
  retencionesCentavos: 0,
  tieneActivoFijo: false,
  ...cambios,
});

const FONDO_UUID = FONDO_ID;

beforeEach(async () => {
  m = await armarEscenario(1_000_000);
});

const recibir = (cambios: Partial<DocumentoParaDestino> = {}) =>
  new RecibirDocumento(m.dependencias).ejecutar(operador, documento(cambios));
const enLaBandeja = () => [...m.comprobantes.filas.values()].filter((c) => c.fondoId === null);

describe('RecibirDocumento', () => {
  it('sin referencia guarda el documento en la bandeja con lo copiado del libro, sin avisos ni eventos', async () => {
    const respuesta = await recibir({ totalCentavos: 112_000, tieneActivoFijo: true });

    expect(respuesta).toEqual({ avisos: [] });
    expect(enLaBandeja()).toMatchObject([
      {
        clase: 'documento',
        fondoId: null,
        montoCentavos: 112_000,
        conRetencion: false,
        conActivoFijo: true,
        fecha: HOY,
      },
    ]);
    expect(m.publicador.nombres()).toEqual([]);
  });

  it('con retención guarda el neto como monto y la retención aparte, y no asigna aunque traiga la referencia', async () => {
    const respuesta = await recibir({
      totalCentavos: 560_000,
      retencionesCentavos: 9_000,
      referenciaDeDestino: FONDO_UUID,
    });

    expect(respuesta.avisos).toHaveLength(1);
    expect(respuesta.avisos[0]).toMatch(/^Quedó en la bandeja de Caja chica: lleva retención de Q\s90\.00/);
    expect(enLaBandeja()).toMatchObject([{ montoCentavos: 551_000, montoRetenidoCentavos: 9_000, conRetencion: true }]);
    expect(m.publicador.nombres()).toEqual([]);
  });

  it('con la referencia de un fondo lo asigna con la fecha de emisión y publica comprobante_asignado', async () => {
    await recibir({ referenciaDeDestino: FONDO_UUID });

    expect(enLaBandeja()).toEqual([]);
    expect([...m.comprobantes.filas.values()]).toMatchObject([
      { fondoId: FONDO_UUID, fecha: HOY, asignadoPor: operador.usuarioId },
    ]);
    expect(m.publicador.nombres()).toEqual(['caja-chica.comprobante_asignado']);
    expect(m.publicador.publicados[0]!.datos).toMatchObject({
      fondoId: FONDO_UUID,
      montoCentavos: 112_000,
      deducible: true,
    });
  });

  it('si no se puede asignar lo deja en la bandeja con el porqué: referencia mal escrita, fondo ajeno, tope, efectivo, fecha', async () => {
    m.config.topePorOmisionCentavos = 50_000;
    const malEscrita = await recibir({ referenciaDeDestino: 'no-es-un-uuid' });
    const ajeno = await recibir({ referenciaDeDestino: '22222222-2222-4222-8222-222222222222' });
    const sobreElTope = await recibir({ referenciaDeDestino: FONDO_UUID });
    m.config.topePorOmisionCentavos = 0;
    const sinEfectivo = await recibir({ referenciaDeDestino: FONDO_UUID, totalCentavos: 1_200_000 });
    const antesDeLaApertura = await recibir({ referenciaDeDestino: FONDO_UUID, fechaEmision: '2026-10-01' });

    expect(malEscrita.avisos[0]).toBe('Quedó en la bandeja de Caja chica: el fondo indicado no es válido.');
    expect(ajeno.avisos[0]).toContain('El fondo no existe o no tiene acceso');
    expect(sobreElTope.avisos[0]).toContain('el tope es de');
    expect(sinEfectivo.avisos[0]).toContain('más de lo que tiene');
    expect(antesDeLaApertura.avisos[0]).toContain('anterior a la apertura');
    expect(enLaBandeja()).toHaveLength(5);
  });

  it('un documento que ya llegó se rechaza', async () => {
    const repetido = documento();
    const caso = new RecibirDocumento(m.dependencias);
    await caso.ejecutar(operador, repetido);

    await expect(caso.ejecutar(operador, repetido)).rejects.toMatchObject({
      codigo: 'documento_ya_recibido_en_caja_chica',
    });
  });

  it('una nota de crédito resta, apunta al comprobante de su factura y sin factura aquí se rechaza', async () => {
    const factura = documento({ referenciaDeDestino: FONDO_UUID });
    await new RecibirDocumento(m.dependencias).ejecutar(operador, factura);

    await recibir({
      tipo: 'nota_de_credito',
      documentoAfectadoId: factura.documentoId,
      totalCentavos: 56_000,
      referenciaDeDestino: FONDO_UUID,
    });

    const nota = [...m.comprobantes.filas.values()].find((c) => c.esNotaDeCredito)!;
    const comprobanteDeLaFactura = [...m.comprobantes.filas.values()].find(
      (c) => c.documentoDeCompraId === factura.documentoId,
    )!;
    expect(nota).toMatchObject({ resta: true, fondoId: FONDO_UUID, documentoAfectadoId: comprobanteDeLaFactura.id });
    const sinFactura = recibir({ tipo: 'nota_de_credito', documentoAfectadoId: crypto.randomUUID() });
    const delSistemaAnterior = recibir({
      tipo: 'nota_de_credito',
      facturaAnterior: { tipo: 'factura', serie: 'A', numero: '9', fechaEmision: '2026-01-01' },
    });
    await expect(sinFactura).rejects.toMatchObject({ codigo: 'factura_de_la_nota_no_recibida_en_caja_chica' });
    await expect(delSistemaAnterior).rejects.toMatchObject({ codigo: 'factura_de_la_nota_no_recibida_en_caja_chica' });
  });

  it('un documento fuera del libro se asigna con su aviso y no es deducible', async () => {
    m.comprobantes.enElLibro = false;

    const respuesta = await recibir({ referenciaDeDestino: FONDO_UUID });

    expect(respuesta.avisos).toEqual([
      'No da crédito fiscal ni es deducible: el documento quedó fuera del libro de compras (no tiene FEL).',
    ]);
    expect(m.publicador.publicados[0]!.datos).toMatchObject({ deducible: false });
  });
});
