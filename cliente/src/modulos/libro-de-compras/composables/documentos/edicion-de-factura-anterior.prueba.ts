import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { FacturaAnteriorSugerida } from '../../servicios/facturas-anteriores.api';
import {
  cuerpoDeFacturaAnterior,
  diaAnterior,
  elegirLaFacturaQueCorrige,
  facturaAnteriorVacia,
  facturaDesdeSugerencia,
  opcionDeFacturaAnterior,
  opcionesDeTipoDeFacturaAnterior,
  pendientesDeFacturaAnterior,
  textoDeSugerencia,
  valorDelSelectorDeFactura,
  VALOR_FACTURA_ANTERIOR,
  type FacturaAnteriorEnEdicion,
} from './edicion-de-factura-anterior';

beforeEach(() => setActivePinia(createPinia()));

const completa = (cambios: Partial<FacturaAnteriorEnEdicion> = {}): FacturaAnteriorEnEdicion => ({
  ...facturaAnteriorVacia(),
  serie: ' A ',
  numero: ' 123 ',
  fechaEmision: '2026-01-05',
  total: 1120,
  iva: '120',
  ...cambios,
});

const sugerida = (cambios: Partial<FacturaAnteriorSugerida> = {}): FacturaAnteriorSugerida => ({
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

describe('cuerpoDeFacturaAnterior', () => {
  it('arma el cuerpo con los montos como texto con dos decimales y las notas de débito en cero', () => {
    expect(cuerpoDeFacturaAnterior(completa())).toEqual({
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
    });
  });

  it('con IVA 0 escrito como número sigue completo', () => {
    expect(cuerpoDeFacturaAnterior(completa({ iva: 0 }))?.iva).toBe('0.00');
  });

  it('manda las notas de débito anteriores y la autorización cuando se escriben', () => {
    const cuerpo = cuerpoDeFacturaAnterior(
      completa({ debitosAnterioresTotal: 224, debitosAnterioresIva: '24', autorizacionFel: ' UUID-9 ' }),
    );
    expect(cuerpo).toMatchObject({
      notasDeDebitoAnterioresTotal: '224.00',
      notasDeDebitoAnterioresIva: '24.00',
      autorizacionFel: 'UUID-9',
    });
  });

  it('sin crédito manda el motivo elegido y, solo con «otra causa», su detalle', () => {
    const porPlazo = completa({ dioCredito: false, motivoSinCredito: 'fuera_de_plazo', detalleDelMotivo: 'sobra' });
    expect(cuerpoDeFacturaAnterior(porPlazo)).toMatchObject({
      motivoSinCredito: 'fuera_de_plazo',
      detalleDelMotivo: null,
    });
    const otra = completa({
      dioCredito: false,
      motivoSinCredito: 'otra_causa_sin_credito',
      detalleDelMotivo: ' Sin los requisitos del art. 18 ',
    });
    expect(cuerpoDeFacturaAnterior(otra)).toMatchObject({
      motivoSinCredito: 'otra_causa_sin_credito',
      detalleDelMotivo: 'Sin los requisitos del art. 18',
    });
  });

  it('si dio crédito ignora un motivo que quedó escrito antes', () => {
    const factura = completa({ dioCredito: true, motivoSinCredito: 'exento' });
    expect(cuerpoDeFacturaAnterior(factura)?.motivoSinCredito).toBeNull();
  });

  it('devuelve null mientras falte algo', () => {
    expect(cuerpoDeFacturaAnterior(facturaAnteriorVacia())).toBeNull();
    expect(cuerpoDeFacturaAnterior(completa({ total: '' }))).toBeNull();
    expect(cuerpoDeFacturaAnterior(completa({ iva: '' }))).toBeNull();
    expect(cuerpoDeFacturaAnterior(completa({ dioCredito: false }))).toBeNull();
  });
});

describe('pendientesDeFacturaAnterior', () => {
  it('dice qué falta en palabras del usuario', () => {
    expect(pendientesDeFacturaAnterior(facturaAnteriorVacia())).toEqual([
      'escribir el número de la factura del sistema anterior',
      'poner la fecha de la factura del sistema anterior',
      'escribir el total de la factura del sistema anterior',
      'escribir el IVA de la factura del sistema anterior (0 si no tiene)',
    ]);
  });

  it('sin crédito pide el motivo y, con «otra causa», explicarla', () => {
    expect(pendientesDeFacturaAnterior(completa({ dioCredito: false }))).toEqual([
      'decir por qué la factura anterior no dio crédito fiscal',
    ]);
    const otra = completa({ dioCredito: false, motivoSinCredito: 'otra_causa_sin_credito', detalleDelMotivo: '  ' });
    expect(pendientesDeFacturaAnterior(otra)).toEqual(['explicar la otra causa por la que no dio crédito']);
  });

  it('no hay pendientes con todo escrito', () => {
    expect(pendientesDeFacturaAnterior(completa())).toEqual([]);
  });
});

describe('facturaDesdeSugerencia', () => {
  it('llena todos los campos y deja vacías las notas de débito en cero', () => {
    const factura = facturaDesdeSugerencia(sugerida({ autorizacionFel: 'UUID-1', serie: null }));
    expect(factura).toMatchObject({
      tipo: 'factura',
      serie: '',
      numero: '123',
      autorizacionFel: 'UUID-1',
      total: '1120.00',
      dioCredito: true,
      debitosAnterioresTotal: '',
      debitosAnterioresIva: '',
    });
  });

  it('trae el motivo, su detalle y las notas de débito anteriores de una ya usada', () => {
    const factura = facturaDesdeSugerencia(
      sugerida({
        motivoSinCredito: 'otra_causa_sin_credito',
        detalleDelMotivo: 'Otro NIT',
        notasDeDebitoAnterioresTotal: '224.00',
        notasDeDebitoAnterioresIva: '24.00',
      }),
    );
    expect(factura).toMatchObject({
      dioCredito: false,
      motivoSinCredito: 'otra_causa_sin_credito',
      detalleDelMotivo: 'Otro NIT',
      debitosAnterioresTotal: '224.00',
      debitosAnterioresIva: '24.00',
    });
  });

  it('el motivo de una familia sin IVA no se escribe a mano: lo pone el servidor', () => {
    const factura = facturaDesdeSugerencia(
      sugerida({ tipo: 'factura_pequeno_contribuyente', motivoSinCredito: 'pequeno_contribuyente' }),
    );
    expect(factura).toMatchObject({ tipo: 'factura_pequeno_contribuyente', dioCredito: true, motivoSinCredito: null });
  });

  it('se muestra con serie, fecha y total', () => {
    expect(textoDeSugerencia(sugerida()).replaceAll('\u00a0', ' ')).toBe('A-123 · 05/01/2026 · Q 1,120.00');
    expect(textoDeSugerencia(sugerida({ serie: null }))).toMatch(/^123 · /);
  });
});

describe('el selector «Factura que corrige»', () => {
  it('elegir «del sistema anterior» deja sin factura del libro, y elegir una del libro vuelve al libro', () => {
    expect(elegirLaFacturaQueCorrige(VALOR_FACTURA_ANTERIOR)).toEqual({
      origenDeLaFactura: 'anterior',
      documentoAfectadoId: null,
    });
    expect(elegirLaFacturaQueCorrige('f-1')).toEqual({ origenDeLaFactura: 'libro', documentoAfectadoId: 'f-1' });
    expect(elegirLaFacturaQueCorrige(null)).toEqual({ origenDeLaFactura: 'libro', documentoAfectadoId: null });
  });

  it('el valor que se ve es la factura del libro o la opción del sistema anterior', () => {
    expect(valorDelSelectorDeFactura('libro', 'f-1')).toBe('f-1');
    expect(valorDelSelectorDeFactura('anterior', null)).toBe(VALOR_FACTURA_ANTERIOR);
  });

  it('la opción solo existe si la empresa tiene fecha de inicio, y la nombra', () => {
    expect(opcionDeFacturaAnterior(null)).toEqual([]);
    expect(opcionDeFacturaAnterior('2026-03-01')).toEqual([
      { valor: VALOR_FACTURA_ANTERIOR, texto: 'Una factura del sistema anterior (antes del 01/03/2026)' },
    ]);
  });
});

describe('otros ayudantes', () => {
  it('el día anterior a la fecha de inicio, también a inicio de mes y de año', () => {
    expect(diaAnterior('2026-03-15')).toBe('2026-03-14');
    expect(diaAnterior('2026-03-01')).toBe('2026-02-28');
    expect(diaAnterior('2026-01-01')).toBe('2025-12-31');
  });

  it('los tipos de la factura anterior son familias de factura, por nombre', () => {
    const textos = opcionesDeTipoDeFacturaAnterior().map(({ texto }) => texto);
    expect(textos).toHaveLength(5);
    expect(textos).toEqual([...textos].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })));
  });
});
