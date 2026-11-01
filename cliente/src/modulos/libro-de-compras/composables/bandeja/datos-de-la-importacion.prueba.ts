import { describe, expect, it } from 'vitest';
import type { LoteDeDte } from '../../servicios/dte-recibidos.api';
import {
  extensionAdmitida,
  hayRechazos,
  lineasDelResumen,
  rechazosRecortados,
  textoDelMotivo,
  titularDelResultado,
} from './datos-de-la-importacion';

const lote = (cambios: Partial<LoteDeDte> = {}): LoteDeDte => ({
  id: 'l1',
  formato: 'xls',
  nombreDelArchivo: 'consulta.xls',
  emisionDesde: '2026-10-01',
  emisionHasta: '2026-10-31',
  filasLeidas: 10,
  filasNuevas: 6,
  filasActualizadas: 1,
  filasSinCambio: 2,
  filasRechazadas: 1,
  anuladasEnLaSat: 0,
  rechazos: [{ fila: 4, autorizacion: null, motivo: 'moneda_no_admitida', detalle: 'USD' }],
  encabezadosNoReconocidos: [],
  ...cambios,
});

describe('importar el archivo de la SAT', () => {
  it.each([
    ['consulta.xls', true],
    ['CONSULTA.XLSX', true],
    ['datos.csv', true],
    ['foto.png', false],
    ['consulta.xls.exe', false],
  ])('la extensión de %s es admitida: %s', (nombre, esperado) => {
    expect(extensionAdmitida(nombre)).toBe(esperado);
  });

  it('el motivo de un rechazo se dice en palabras y uno desconocido se deja tal cual', () => {
    expect(textoDelMotivo('moneda_no_admitida')).toBe('La moneda no es quetzales');
    expect(textoDelMotivo('motivo_nuevo')).toBe('motivo_nuevo');
  });

  it('el resumen omite las cuentas en cero, menos la de los nuevos', () => {
    const etiquetas = (l: LoteDeDte) => lineasDelResumen(l).map(({ etiqueta }) => etiqueta);

    expect(etiquetas(lote())).toEqual([
      'DTE nuevos en pendientes',
      'DTE que cambiaron en la SAT',
      'DTE que ya estaban igual',
      'Filas que no entraron',
    ]);
    expect(etiquetas(lote({ filasNuevas: 0, filasActualizadas: 0, filasSinCambio: 0, filasRechazadas: 0 }))).toEqual([
      'DTE nuevos en pendientes',
    ]);
  });

  it('el titular cuenta las filas y los nuevos en singular o plural', () => {
    expect(titularDelResultado(lote())).toBe('Se leyeron 10 filas: 6 DTE nuevos.');
    expect(titularDelResultado(lote({ filasNuevas: 1 }))).toBe('Se leyeron 10 filas: 1 DTE nuevo.');
    expect(titularDelResultado(lote({ filasLeidas: 0 }))).toBe('El archivo no tenía filas con datos.');
  });

  it('avisa si hubo rechazos y si la lista de rechazos está recortada', () => {
    expect(hayRechazos(lote())).toBe(true);
    expect(hayRechazos(lote({ filasRechazadas: 0 }))).toBe(false);
    expect(rechazosRecortados(lote())).toBe(false);
    expect(rechazosRecortados(lote({ filasRechazadas: 2000 }))).toBe(true);
  });
});
