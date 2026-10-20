import { describe, expect, it } from 'vitest';
import {
  alternarId,
  depurarSeleccion,
  filtrosIniciales,
  idsParaAnotar,
  marcadas,
  nombreDelDocumento,
  nombreDelImpuesto,
  opcionesDeConstancia,
  opcionesDeDocumentos,
  opcionesDeGrupo,
  prefijoDelPlazo,
  textoDeCantidad,
  textoDelPorcentaje,
  todasMarcadas,
  tonoDelEstado,
} from './datos-de-retenciones';
import { retencion } from './retenciones.soporte';

describe('filtros y opciones', () => {
  it('abre en el mes anterior y sin filtros', () => {
    expect(filtrosIniciales(new Date(2026, 9, 20))).toEqual({
      mes: '2026-09',
      grupo: '',
      constancia: 'todas',
      documentos: 'todos',
    });
  });

  it('los grupos empiezan con «Todos» y siguen en orden de nombre', () => {
    const textos = opcionesDeGrupo().map((o) => o.texto);
    expect(textos[0]).toBe('Todos los grupos');
    const resto = textos.slice(1);
    expect(resto).toEqual([...resto].sort((a, b) => a.localeCompare(b, 'es')));
    expect(resto).toHaveLength(4);
  });

  it('los demás selectores van en orden de nombre', () => {
    expect(opcionesDeConstancia().map((o) => o.valor)).toEqual(['con', 'sin', 'todas']);
    expect(opcionesDeDocumentos().map((o) => o.valor)).toEqual(['anulados', 'todos', 'vigentes']);
  });
});

describe('estados', () => {
  it('el vencido es rojo y el enterado, verde', () => {
    expect(tonoDelEstado('vencido')).toBe('rojo');
    expect(tonoDelEstado('enterado')).toBe('campo');
  });

  it('el plazo se lee según el estado', () => {
    expect(prefijoDelPlazo('vencido')).toBe('Venció el');
    expect(prefijoDelPlazo('pendiente')).toBe('Vence el');
    expect(prefijoDelPlazo('enterado')).toBe('Plazo:');
  });
});

describe('textos de la retención', () => {
  it('el porcentaje quita los decimales vacíos', () => {
    expect(textoDelPorcentaje('5.00')).toBe('5 %');
    expect(textoDelPorcentaje('12.50')).toBe('12.50 %');
    expect(textoDelPorcentaje(null)).toBe('');
  });

  it('el impuesto lleva su porcentaje si lo tiene', () => {
    expect(nombreDelImpuesto({ impuesto: 'iva', porcentaje: '15.00' })).toBe('IVA 15 %');
    expect(nombreDelImpuesto({ impuesto: 'isr', porcentaje: null })).toBe('ISR');
  });

  it('el documento lleva tipo, serie y número', () => {
    expect(nombreDelDocumento(retencion().documento)).toBe('FPEQ A-123');
    expect(nombreDelDocumento({ ...retencion().documento, serie: null, tipoDte: null })).toBe('123');
  });

  it('cuenta en singular y plural', () => {
    expect(textoDeCantidad(1, 'retención', 'retenciones')).toBe('1 retención');
    expect(textoDeCantidad(3, 'retención', 'retenciones')).toBe('3 retenciones');
  });
});

describe('selección para anotar constancias', () => {
  const lista = [
    retencion({ id: 'a' }),
    retencion({ id: 'b', enCero: true, retenido: '0.00' }),
    retencion({ id: 'c', constanciaNumero: 'C-1', constanciaFecha: '2026-09-12' }),
    retencion({ id: 'd' }),
  ];

  it('solo se anotan las que tienen monto y no tienen constancia', () => {
    expect(idsParaAnotar(lista)).toEqual(['a', 'd']);
  });

  it('marca y desmarca', () => {
    expect(alternarId(['a'], 'd')).toEqual(['a', 'd']);
    expect(alternarId(['a', 'd'], 'a')).toEqual(['d']);
  });

  it('sabe si están todas marcadas', () => {
    expect(todasMarcadas(['a', 'd'], ['a', 'd'])).toBe(true);
    expect(todasMarcadas(['a'], ['a', 'd'])).toBe(false);
    expect(todasMarcadas([], [])).toBe(false);
  });

  it('al cambiar la lista se sueltan las que ya no están', () => {
    expect(depurarSeleccion(['a', 'z'], lista)).toEqual(['a']);
  });

  it('devuelve las marcadas en el orden de la tabla', () => {
    expect(marcadas(['d', 'a'], lista).map((r) => r.id)).toEqual(['a', 'd']);
  });
});
