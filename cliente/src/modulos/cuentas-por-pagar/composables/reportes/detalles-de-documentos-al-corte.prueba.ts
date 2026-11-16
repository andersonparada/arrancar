import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { FilaDeDocumentoAlCorte } from '../../servicios/tipos-de-reportes';
import {
  estaVencida,
  notasDeLaFila,
  textoDeContrasena,
  textoDeVencimiento,
  tituloDeLaFila,
  tonoDeEstadoDePago,
} from './detalles-de-documentos-al-corte';

beforeEach(() => setActivePinia(createPinia()));

const fila: FilaDeDocumentoAlCorte = {
  id: 'd-1',
  proveedorId: 'p-1',
  proveedorNombre: 'Ferretería Sur',
  proveedorNit: '123',
  tipo: 'factura',
  origen: 'libro_de_compras',
  serie: 'A',
  numero: '45',
  fechaEmision: '2026-10-01',
  vencimiento: '2026-10-31',
  diasVencido: 15,
  tramo: 'de_1_a_30',
  total: '1000.00',
  retenciones: '0.00',
  neto: '1000.00',
  anterioresAlInicio: null,
  notasAplicadas: '0.00',
  pagado: '0.00',
  ajustado: '0.00',
  saldo: '1000.00',
  comprometido: '0.00',
  estadoDePago: 'pendiente',
  autorizado: true,
  contrasena: null,
  retencionesPorPracticar: null,
};
const dar = (monto: string): string => `Q${monto}`;

describe('detalles de un cargo al corte', () => {
  it('titula con tipo, serie y número', () => {
    expect(tituloDeLaFila(fila)).toBe('Factura A-45');
  });

  it('dice cuántos días lleva vencido, y no cuenta lo que aún no vence', () => {
    expect(textoDeVencimiento(fila)).toBe('Vence 31/10/2026 · 15 días vencido');
    expect(textoDeVencimiento({ ...fila, diasVencido: 1 })).toMatch(/1 día vencido/);
    expect(textoDeVencimiento({ ...fila, diasVencido: -3 })).toBe('Vence 31/10/2026');
    expect(textoDeVencimiento({ ...fila, vencimiento: null, diasVencido: null })).toBe('Sin vencimiento');
  });

  it('solo marca vencido lo que tiene saldo', () => {
    expect(estaVencida(fila)).toBe(true);
    expect(estaVencida({ ...fila, saldo: '0.00' })).toBe(false);
    expect(estaVencida({ ...fila, diasVencido: 0 })).toBe(false);
  });

  it('muestra la contraseña con su pago prometido', () => {
    expect(textoDeContrasena(fila)).toBeNull();
    expect(textoDeContrasena({ ...fila, contrasena: { numero: '12', pagoPrometido: '2026-11-20' } })).toBe(
      'N.º 12, pago prometido 20/11/2026',
    );
  });

  it('explica lo propio de un saldo inicial', () => {
    expect(notasDeLaFila(fila, dar)).toEqual([]);
    const inicial = { ...fila, anterioresAlInicio: '300.00', retencionesPorPracticar: '25.00' };
    expect(notasDeLaFila(inicial, dar)).toEqual([
      'Pagos y notas anteriores a la fecha de inicio: Q300.00',
      'Retenciones por practicar: Q25.00',
    ]);
    expect(notasDeLaFila({ ...fila, retencionesPorPracticar: '0.00' }, dar)).toEqual([]);
  });

  it('da un tono a cada estado de pago', () => {
    expect(tonoDeEstadoDePago('pagado')).toBe('campo');
    expect(tonoDeEstadoDePago('en_parte')).toBe('trigo');
  });
});
