import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ReporteDePagosRealizados } from '../../servicios/tipos-de-reportes-de-pagos';
import {
  cantidadDeFiltrosDePagos,
  consultaDePagos,
  consultaParaExportarPagos,
  errorDeRangoDePagos,
  estadoDeImpresionDePagos,
  filtrosDePagosIniciales,
  lineasDeImpresionDePagos,
  OPCIONES_DE_FORMA,
  textoDelDocumentoPagado,
  textoDeQuienRegistro,
  totalesDePagos,
} from './pagos-realizados';

beforeEach(() => setActivePinia(createPinia()));
const HOY = '2026-11-18';

const suma = (monto: string, lineas = 1) => ({ lineas, monto, retencionDescontada: '10.00', cubre: '110.00' });
const reporte = (anulados = 0): ReporteDePagosRealizados => ({
  desde: '2026-11-01',
  hasta: HOY,
  filas: [],
  total: 3,
  pagina: 1,
  limite: 50,
  totales: { porForma: [], vigentes: suma('100.00', 3), anulados: suma('25.00', anulados) },
  leyendas: [],
});

describe('pagos realizados', () => {
  it('abre con el mes en curso, vigentes y sin marcas', () => {
    const filtros = filtrosDePagosIniciales(HOY);
    expect(filtros.desde).toBe('2026-11-01');
    expect(filtros.hasta).toBe(HOY);
    expect(filtros.estado).toBe('vigentes');
    expect(cantidadDeFiltrosDePagos(filtros, HOY)).toBe(0);
  });

  it('manda solo lo que se salió de lo normal', () => {
    const filtros = { ...filtrosDePagosIniciales(HOY), mismaPersona: true, forma: 'cheque' as const };
    expect(consultaParaExportarPagos(filtros)).toMatchObject({
      forma: 'cheque',
      mismaPersona: true,
      posfechados: undefined,
      proveedorId: undefined,
    });
    expect(consultaDePagos(filtros, 2, 50)).toMatchObject({ pagina: 2, limite: 50 });
    expect(cantidadDeFiltrosDePagos(filtros, HOY)).toBe(2);
  });

  it('dice cómo corregir el rango', () => {
    expect(errorDeRangoDePagos('2026-11-01', '2026-11-18')).toBeUndefined();
    expect(errorDeRangoDePagos('2026-11-1', '2026-11-18')).toMatch(/completas/);
    expect(errorDeRangoDePagos('2026-11-19', '2026-11-18')).toMatch(/posterior/);
    expect(errorDeRangoDePagos('2024-11-18', '2026-11-18')).toBeUndefined();
    expect(errorDeRangoDePagos('2024-11-18', '2026-12-17')).toBeUndefined();
    expect(errorDeRangoDePagos('2024-11-18', '2026-12-18')).toMatch(/24 meses/);
  });

  it('ordena las formas por nombre después de «todas»', () => {
    const textos = OPCIONES_DE_FORMA.slice(1).map((o) => o.texto);
    expect(OPCIONES_DE_FORMA[0]?.valor).toBe('');
    expect(textos).toEqual([...textos].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('junta quién ingresó y quién completó el documento', () => {
    expect(textoDeQuienRegistro({ registroElDocumento: 'Ana', completoElDocumento: 'Luis' })).toBe(
      'Ingresó Ana · Completó Luis',
    );
    expect(textoDeQuienRegistro({ registroElDocumento: null, completoElDocumento: null })).toBe('');
    expect(textoDelDocumentoPagado({ serie: 'A', numeroDelDocumento: '15' })).toBe('A-15');
    expect(textoDelDocumentoPagado({ serie: null, numeroDelDocumento: '15' })).toBe('15');
  });

  it('muestra los anulados aparte y solo si hay', () => {
    expect(totalesDePagos(reporte()).map((t) => t.etiqueta)).not.toContain('Anulados (no suman)');
    const con = totalesDePagos(reporte(2));
    expect(con.at(-1)).toEqual({ etiqueta: 'Anulados (no suman)', valor: formatearMonto('25.00') });
    expect(con[0]).toMatchObject({ valor: formatearMonto('100.00'), destacado: true });
  });

  it('describe el filtro al imprimir', () => {
    const filtros = { ...filtrosDePagosIniciales(HOY), mismaPersona: true };
    const lineas = lineasDeImpresionDePagos(filtros, 'Agro SA');
    expect(lineas[1]).toContain('Agro SA');
    expect(lineas[2]).toContain('Solo vigentes');
  });

  it('solo imprime hasta 2,000 filas', () => {
    expect(estadoDeImpresionDePagos(0).puede).toBe(false);
    expect(estadoDeImpresionDePagos(2000).puede).toBe(true);
    expect(estadoDeImpresionDePagos(2001).mensaje).toContain('Son 2001 filas');
  });
});
