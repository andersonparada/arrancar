import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { FilaDeSaldoAFavor, ReporteDeSaldosAFavor } from '../../servicios/tipos-de-reportes-de-proveedor';
import {
  cantidadDeFiltrosDeSaldosAFavor,
  consultaDeSaldosAFavor,
  filtrosDeSaldosAFavorIniciales,
  lineasDeImpresionDeSaldosAFavor,
  separarPorPrescripcion,
  textoDeAntiguedad,
  tituloDeLaNota,
  totalesDeSaldosAFavor,
} from './saldos-a-favor';

beforeEach(() => setActivePinia(createPinia()));
const HOY = '2026-11-15';

const fila = (cambios: Partial<FilaDeSaldoAFavor> = {}): FilaDeSaldoAFavor => ({
  id: 'n-1',
  proveedorId: 'p-1',
  proveedorNombre: 'Agro SA',
  proveedorNit: '1234567',
  serie: 'NC',
  numero: '45',
  fechaEmision: '2021-01-10',
  base: '100.00',
  aplicado: '0.00',
  ajustado: '0.00',
  reintegrado: '0.00',
  saldoLibre: '100.00',
  ultimoMovimiento: '2024-05-01',
  aniosDesdeElUltimoMovimiento: 2,
  tramo: 'de_2_a_3',
  posiblePrescripcionDesde: '2029-05-01',
  posiblementePrescrito: false,
  enContrasena: false,
  ...cambios,
});

describe('saldos a favor', () => {
  it('abre con el corte de hoy y sin filtros', () => {
    const filtros = filtrosDeSaldosAFavorIniciales(HOY);
    expect(filtros).toEqual({ corte: HOY, proveedorId: '', incluirSinSaldo: false });
    expect(cantidadDeFiltrosDeSaldosAFavor(filtros, HOY)).toBe(0);
    expect(consultaDeSaldosAFavor(filtros)).toEqual({ corte: HOY, proveedorId: undefined, incluirSinSaldo: undefined });
  });

  it('cuenta y manda lo que cambió', () => {
    const filtros = filtrosDeSaldosAFavorIniciales(HOY, 'p-1', '2026-10-31');
    expect(cantidadDeFiltrosDeSaldosAFavor({ ...filtros, incluirSinSaldo: true }, HOY)).toBe(3);
    expect(consultaDeSaldosAFavor(filtros)).toMatchObject({ corte: '2026-10-31', proveedorId: 'p-1' });
  });

  it('titula la nota con su serie y dice la antigüedad en años cumplidos', () => {
    expect(tituloDeLaNota(fila())).toBe('Nota de crédito NC-45');
    expect(textoDeAntiguedad(fila({ aniosDesdeElUltimoMovimiento: 0 }))).toBe('Menos de 1 año');
    expect(textoDeAntiguedad(fila({ aniosDesdeElUltimoMovimiento: 1 }))).toBe('1 año');
    expect(textoDeAntiguedad(fila())).toBe('2 años');
  });

  it('separa lo posiblemente prescrito de lo que está dentro del plazo', () => {
    const prescrita = fila({ id: 'n-2', posiblementePrescrito: true, tramo: 'de_5_o_mas' });
    const { vigentes, prescritas } = separarPorPrescripcion([fila(), prescrita]);
    expect(vigentes.map((f) => f.id)).toEqual(['n-1']);
    expect(prescritas.map((f) => f.id)).toEqual(['n-2']);
  });

  it('las cifras de arriba traen el total y lo posiblemente prescrito', () => {
    const reporte = {
      corte: HOY,
      filas: [fila()],
      total: '100.00',
      posiblementePrescrito: { cantidad: 2, total: '40.00' },
    } as ReporteDeSaldosAFavor;
    const totales = totalesDeSaldosAFavor(reporte);
    expect(totales[0]).toMatchObject({ valor: formatearMonto('100.00'), destacado: true });
    expect(totales[1]).toMatchObject({ etiqueta: 'Nota', valor: '1' });
    expect(totales[2]?.valor).toBe(`${formatearMonto('40.00')} (2)`);
  });

  it('rotula el encabezado impreso', () => {
    const filtros = { ...filtrosDeSaldosAFavorIniciales(HOY), incluirSinSaldo: true };
    expect(lineasDeImpresionDeSaldosAFavor(filtros, null)).toEqual([
      expect.stringContaining('Saldos a favor al'),
      'Proveedor: todos',
      'Incluye notas sin saldo',
    ]);
  });
});
