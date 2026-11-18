import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  cantidadDeFiltrosDeAjustes,
  cantidadDeFilasDeAjustes,
  consultaDeAjustes,
  filtrosDeAjustesIniciales,
  lineasDeImpresionDeAjustes,
  mesAntesDe,
  OPCIONES_DE_CAUSA,
  opcionesDeMeses,
  textoDeLaBaja,
  textoDeMes,
  totalesDeAjustes,
} from './ajustes-del-mes';
import type { ReporteDeAjustesDelMes } from '../../servicios/tipos-de-reportes-de-control';

beforeEach(() => setActivePinia(createPinia()));
const HOY = '2026-11-18';
const cero = { cantidad: 0, monto: '0.00' };

const vacio = (): ReporteDeAjustesDelMes => ({
  mes: '2026-10',
  ajustes: [],
  anulacionesDeOtrosMeses: [],
  aplicacionesManuales: [],
  pagosAApertura: [],
  documentosAnulados: [],
  documentosDesautorizados: [],
  totales: {
    porCausa: [],
    ajustesAnulados: cero,
    porSeccion: {
      ajustes: { cantidad: 2, monto: '30.00' },
      anulacionesDeOtrosMeses: cero,
      aplicacionesManuales: cero,
      pagosAApertura: cero,
      documentosAnulados: { cantidad: 1, monto: '5.00' },
      documentosDesautorizados: cero,
    },
  },
  leyendas: [],
});

describe('ajustes del mes', () => {
  it('abre con el mes anterior, también al cambiar de año', () => {
    expect(filtrosDeAjustesIniciales(HOY).mes).toBe('2026-10');
    expect(mesAntesDe('2026-01-05', 1)).toBe('2025-12');
    expect(mesAntesDe('2026-03-31', 14)).toBe('2025-01');
  });

  it('escribe el mes con palabras', () => {
    expect(textoDeMes('2026-10')).toBe('octubre de 2026');
  });

  it('ofrece 36 meses, del más reciente al más antiguo, empezando por el actual', () => {
    const opciones = opcionesDeMeses(HOY);
    expect(opciones).toHaveLength(36);
    expect(opciones[0]).toEqual({ valor: '2026-11', texto: 'noviembre de 2026' });
    expect(opciones[35]?.valor).toBe('2023-12');
  });

  it('ordena las causas por nombre después de «todas»', () => {
    const textos = OPCIONES_DE_CAUSA.slice(1).map((o) => o.texto);
    expect(textos).toEqual([...textos].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('cuenta y manda solo los filtros distintos de lo normal', () => {
    const filtros = { ...filtrosDeAjustesIniciales(HOY), causa: 'no_recuperable' as const, mes: '2026-09' };
    expect(cantidadDeFiltrosDeAjustes(filtros, HOY)).toBe(2);
    expect(consultaDeAjustes(filtros)).toEqual({ mes: '2026-09', proveedorId: undefined, causa: 'no_recuperable' });
    expect(cantidadDeFiltrosDeAjustes(filtrosDeAjustesIniciales(HOY), HOY)).toBe(0);
  });

  it('resume el mes y cuenta las filas de todas las secciones', () => {
    const reporte = vacio();
    expect(totalesDeAjustes(reporte)[1]).toEqual({ etiqueta: 'Cantidad de ajustes', valor: '2' });
    expect(cantidadDeFilasDeAjustes(reporte)).toBe(0);
    expect(lineasDeImpresionDeAjustes(filtrosDeAjustesIniciales(HOY), 'Agro')[0]).toBe('Ajustes de octubre de 2026');
  });

  it('dice qué se hizo con el documento', () => {
    expect(textoDeLaBaja({ tipoDeBaja: 'desautorizado', estabaAutorizado: true })).toBe('Devuelto a revisión');
    expect(textoDeLaBaja({ tipoDeBaja: 'anulado', estabaAutorizado: true })).toBe('Anulado (estaba autorizado)');
    expect(textoDeLaBaja({ tipoDeBaja: 'anulado', estabaAutorizado: false })).toBe('Anulado');
  });
});
