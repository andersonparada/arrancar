import { describe, expect, it } from 'vitest';
import type { FilaDeSaldo } from '../../servicios/tipos-de-reportes';
import {
  cantidadDeFichas,
  proveedorParaRevisar,
  rutaDeDocumentosDelProveedor,
  tieneFichas,
  tramosConSaldo,
  tramosDe,
} from './bloques-de-saldos';

const CEROS = {
  porVencer: '0.00',
  de1a30: '0.00',
  de31a60: '0.00',
  de61a90: '0.00',
  masDe90: '0.00',
  sinVencimiento: '0.00',
  totalCargos: '0.00',
  saldosAFavor: '0.00',
  saldoNeto: '0.00',
  comprometido: '0.00',
  disponible: '0.00',
  sinAutorizar: '0.00',
};
const ficha = (nombre: string, proveedorId: string): FilaDeSaldo => ({ ...CEROS, nit: '123', nombre, proveedorId });

describe('bloques de saldos', () => {
  it('lista los tramos en el orden en que se leen', () => {
    expect(tramosDe({ ...CEROS, de31a60: '5.00' }).map((t) => t.etiqueta)).toEqual([
      'Por vencer',
      '1 a 30 días',
      '31 a 60 días',
      '61 a 90 días',
      'Más de 90 días',
      'Sin vencimiento',
    ]);
  });

  it('en la tarjeta solo salen los tramos con dinero', () => {
    const con = tramosConSaldo({ ...CEROS, porVencer: '10.00', masDe90: '3.50' });
    expect(con.map((t) => t.clave)).toEqual(['porVencer', 'masDe90']);
  });

  it('un NIT con varias fichas no se revisa como uno solo, cada ficha sí', () => {
    const grupo: FilaDeSaldo = {
      ...ficha('Grupo', 'x'),
      proveedorId: null,
      fichas: [ficha('A', 'a'), ficha('B', 'b')],
    };
    expect(tieneFichas(grupo)).toBe(true);
    expect(proveedorParaRevisar(grupo)).toBeNull();
    expect(proveedorParaRevisar(ficha('Solo', 'p-1'))).toBe('p-1');
    expect(cantidadDeFichas([grupo, ficha('Solo', 'p-1')])).toBe(3);
  });

  it('una sola ficha en la lista no se trata como grupo', () => {
    const una: FilaDeSaldo = { ...ficha('Uno', 'u'), fichas: [ficha('Uno', 'u')] };
    expect(tieneFichas(una)).toBe(false);
    expect(proveedorParaRevisar(una)).toBe('u');
  });

  it('el enlace a R2 lleva el proveedor y el mismo corte', () => {
    expect(rutaDeDocumentosDelProveedor('p-1', '2026-10-31')).toEqual({
      path: '/cuentas-por-pagar/reportes/documentos',
      query: { proveedorId: 'p-1', corte: '2026-10-31' },
    });
  });
});
