import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { FacturaAnteriorDeLaFicha } from '../../servicios/facturas-anteriores.api';
import {
  datosDelDocumentoQueModifica,
  detallesDeLaFacturaAnterior,
  textoDelCredito,
  textoDelDocumentoQueModifica,
} from './documento-que-modifica';

const anterior = (cambios: Partial<FacturaAnteriorDeLaFicha> = {}): FacturaAnteriorDeLaFicha => ({
  tipo: 'factura',
  serie: 'A',
  numero: '123',
  fechaEmision: '2026-01-05',
  autorizacionFel: null,
  total: '1120.00',
  iva: '120.00',
  notasDeDebitoAnterioresTotal: '0.00',
  notasDeDebitoAnterioresIva: '0.00',
  motivoSinCredito: null,
  detalleDelMotivo: null,
  ...cambios,
});

beforeEach(() => setActivePinia(createPinia()));

describe('textoDelDocumentoQueModifica', () => {
  it('nombra la factura del libro con su serie, número y fecha', () => {
    const texto = textoDelDocumentoQueModifica({
      origen: 'libro',
      documentoId: 'f-1',
      tipo: 'factura',
      serie: 'A',
      numero: '123',
      fechaEmision: '2026-01-05',
    });
    expect(texto).toBe('Factura A-123 del 05/01/2026');
  });

  it('dice «del sistema anterior» si no es del libro', () => {
    const texto = textoDelDocumentoQueModifica({
      origen: 'sistema_anterior',
      documentoId: null,
      tipo: 'factura',
      serie: null,
      numero: '77',
      fechaEmision: '2025-12-30',
    });
    expect(texto).toBe('Factura 77 del 30/12/2025 (del sistema anterior)');
  });
});

describe('datosDelDocumentoQueModifica', () => {
  it('no hay nada que mostrar si el documento no es una nota', () => {
    expect(datosDelDocumentoQueModifica({ documentoQueModifica: null, facturaAnterior: null })).toBeNull();
    expect(datosDelDocumentoQueModifica({})).toBeNull();
  });

  it('con una factura del libro da el enlace y ningún detalle', () => {
    const datos = datosDelDocumentoQueModifica({
      documentoQueModifica: {
        origen: 'libro',
        documentoId: 'f-1',
        tipo: 'factura',
        serie: null,
        numero: '5',
        fechaEmision: '2026-04-01',
      },
      facturaAnterior: null,
    });
    expect(datos).toMatchObject({ documentoId: 'f-1', detalles: [] });
  });

  it('con una del sistema anterior no hay enlace y sí sus datos', () => {
    const datos = datosDelDocumentoQueModifica({
      documentoQueModifica: {
        origen: 'sistema_anterior',
        documentoId: null,
        tipo: 'factura',
        serie: 'A',
        numero: '123',
        fechaEmision: '2026-01-05',
      },
      facturaAnterior: anterior(),
    });
    expect(datos?.documentoId).toBeNull();
    expect(datos?.detalles.map(({ etiqueta }) => etiqueta)).toEqual(['Total', 'IVA', 'Crédito fiscal']);
  });
});

describe('detallesDeLaFacturaAnterior', () => {
  it('suma el detalle de la causa, las notas de débito anteriores y la autorización si existen', () => {
    const detalles = detallesDeLaFacturaAnterior(
      anterior({
        motivoSinCredito: 'otra_causa_sin_credito',
        detalleDelMotivo: 'Otro NIT',
        notasDeDebitoAnterioresTotal: '224.00',
        notasDeDebitoAnterioresIva: '24.00',
        autorizacionFel: 'UUID-1',
      }),
    );
    expect(detalles.map(({ etiqueta }) => etiqueta)).toEqual([
      'Total',
      'IVA',
      'Crédito fiscal',
      'Detalle de la causa',
      'Notas de débito del sistema anterior',
      'Autorización FEL',
    ]);
    expect(detalles.find(({ etiqueta }) => etiqueta === 'Crédito fiscal')?.valor).toBe(
      'No dio crédito fiscal: No dio crédito por otra causa',
    );
  });

  it('dice si dio crédito', () => {
    expect(textoDelCredito({ motivoSinCredito: null })).toBe('Sí dio crédito fiscal');
    expect(textoDelCredito({ motivoSinCredito: 'fuera_de_plazo' })).toBe('No dio crédito fiscal: Fuera de plazo');
  });
});
