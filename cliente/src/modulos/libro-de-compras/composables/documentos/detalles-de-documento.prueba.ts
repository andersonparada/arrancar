import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { FichaDeDocumento } from '../../servicios/documentos.api';
import { detallesDeEncabezado } from './detalles-de-documento';

const fichaBase = {
  tipo: 'factura',
  nombreEmisor: 'Agropecuaria Los Andes',
  nitEmisor: '1234567-8',
  numero: '123',
  serie: null,
  nitReceptor: null,
  autorizacionFel: null,
  fechaEmision: '2026-09-15',
  fechaRecepcion: '2026-09-16',
  periodo: '2026-09-01',
  destino: 'cuentas-por-pagar',
  muestraEnReportesSat: true,
  observaciones: null,
  tipoDte: null,
  motivoDeLaFactura: null,
} as unknown as FichaDeDocumento;

// `detallesDeEncabezado` da formato con `formatearFecha`, que lee la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const etiquetas = (ficha: FichaDeDocumento) => detallesDeEncabezado(ficha).map((detalle) => detalle.etiqueta);
const valorDe = (ficha: FichaDeDocumento, etiqueta: string) =>
  detallesDeEncabezado(ficha).find((detalle) => detalle.etiqueta === etiqueta)?.valor;

describe('código SAT en la ficha', () => {
  it('se muestra cuando viene', () => {
    expect(valorDe({ ...fichaBase, tipoDte: 'FAPE' } as FichaDeDocumento, 'Código SAT')).toBe('FAPE');
  });

  it('se omite cuando no viene', () => {
    expect(etiquetas(fichaBase)).not.toContain('Código SAT');
  });
});

describe('motivo de la factura en la ficha', () => {
  it('una nota de crédito muestra el motivo de la factura con el texto de los motivos', () => {
    const nota = {
      ...fichaBase,
      tipo: 'nota_de_credito',
      motivoDeLaFactura: 'contribuyente_agropecuario',
    } as FichaDeDocumento;
    expect(valorDe(nota, 'Motivo de la factura')).toMatch(/^Factura de un contribuyente agropecuario/);
  });

  it('se omite cuando no viene', () => {
    expect(etiquetas(fichaBase)).not.toContain('Motivo de la factura');
  });
});
