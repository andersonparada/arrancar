import { describe, expect, it } from 'vitest';
import type { Chequera } from '../../servicios/chequeras.api';
import type { NumeroDeCheque } from '../../servicios/correlativos-de-cheques.api';
import {
  esAlerta,
  lineasDelEncabezado,
  numerosSinRegistro,
  opcionesDeChequera,
  textoDeAnulados,
  textoDelEstado,
  totalesDelResumen,
} from './resumen-de-correlativos-de-cheques';

const numero = (cambios: Partial<NumeroDeCheque> = {}): NumeroDeCheque => ({
  numero: 1,
  estado: 'emitido',
  causa: null,
  fecha: null,
  beneficiario: null,
  monto: null,
  impreso: false,
  impresoEn: null,
  motivoDeAnulacion: null,
  pasoAlNumero: null,
  ...cambios,
});

describe('textoDelEstado', () => {
  it('dice cada estado y, en un anulado, su causa', () => {
    expect(textoDelEstado(numero({ estado: 'disponible' }))).toBe('Disponible');
    expect(textoDelEstado(numero({ estado: 'emitido' }))).toBe('Emitido');
    expect(textoDelEstado(numero({ estado: 'anulado', causa: 'extraviado' }))).toBe('Anulado · extraviado');
    expect(textoDelEstado(numero({ estado: 'anulado', causa: 'caducidad' }))).toBe('Anulado · por caducidad');
    expect(textoDelEstado(numero({ estado: 'anulado', causa: 'manual' }))).toBe('Anulado · manual');
    expect(textoDelEstado(numero({ estado: 'anulado' }))).toBe('Anulado');
  });

  it('un inutilizado dice a qué número pasó su pago', () => {
    expect(textoDelEstado(numero({ estado: 'inutilizado', pasoAlNumero: 1235 }))).toBe(
      'Inutilizado · su pago pasó al 1235',
    );
    expect(textoDelEstado(numero({ estado: 'inutilizado' }))).toBe('Inutilizado');
  });

  it('un número sin fila pide revisarlo', () => {
    expect(textoDelEstado(numero({ estado: 'sin_registro' }))).toBe('Sin registro: revise');
    expect(esAlerta(numero({ estado: 'sin_registro' }))).toBe(true);
    expect(esAlerta(numero())).toBe(false);
  });
});

describe('totales del resumen', () => {
  const resumen = {
    emitidos: 5,
    anulados: { total: 3, manual: 1, caducidad: 0, extraviado: 2 },
    inutilizados: 1,
    disponibles: 40,
    totalDelRango: 49,
    alerta: null,
  };

  it('el desglose de anulados omite lo que es cero', () => {
    expect(textoDeAnulados(resumen.anulados)).toBe('3 (1 manual, 2 extraviado)');
    expect(textoDeAnulados({ total: 0, manual: 0, caducidad: 0, extraviado: 0 })).toBe('0');
  });

  it('las cifras salen en el orden del papel y los disponibles destacan', () => {
    const totales = totalesDelResumen(resumen);
    expect(totales.map((t) => t.etiqueta)).toEqual([
      'Emitidos',
      'Anulados',
      'Inutilizados',
      'Disponibles',
      'Total del rango',
    ]);
    expect(totales.find((t) => t.destacado)?.valor).toBe('40');
  });
});

describe('encabezado y selectores', () => {
  const reporte = {
    cuenta: { id: 'c', nombre: 'Monetaria', numero: '123-4', banco: 'Banrural' },
    chequera: { id: 'q', serie: 'A', desde: 100, hasta: 199, activa: true, deApertura: false, etiqueta: null },
  };

  it('las líneas del papel dicen la cuenta y la chequera', () => {
    expect(lineasDelEncabezado(reporte, null)).toEqual(['Cuenta: Monetaria · 123-4 · Banrural', 'Chequera: A100-199']);
  });

  it('una chequera de la carga inicial o inactiva lo dice, y un filtro también', () => {
    const apertura = { ...reporte, chequera: { ...reporte.chequera, activa: false, etiqueta: 'De la carga inicial' } };
    expect(lineasDelEncabezado(apertura, 'anulado')).toEqual([
      'Cuenta: Monetaria · 123-4 · Banrural',
      'Chequera: A100-199 (De la carga inicial) · inactiva',
      'Se muestran: Anulados',
    ]);
  });

  it('las chequeras salen por serie y número, con la inactiva marcada', () => {
    const chequera = (datos: Partial<Chequera>) => ({ hasta: 999, activa: true, ...datos }) as Chequera;
    const opciones = opcionesDeChequera([
      chequera({ id: '3', serie: 'B', desde: 1, hasta: 50 }),
      chequera({ id: '2', serie: 'A', desde: 200, hasta: 249, activa: false }),
      chequera({ id: '1', serie: 'A', desde: 100, hasta: 149 }),
    ]);
    expect(opciones.map((o) => o.texto)).toEqual(['A100-149', 'A200-249 (inactiva)', 'B1-50']);
  });

  it('junta los números sin fila para avisarlos', () => {
    expect(numerosSinRegistro([numero({ numero: 1 }), numero({ numero: 7, estado: 'sin_registro' })])).toEqual([7]);
  });
});
