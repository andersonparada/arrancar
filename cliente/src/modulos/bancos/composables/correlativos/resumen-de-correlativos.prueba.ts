import { describe, expect, it } from 'vitest';
import type { Correlativo, Hueco } from '../../servicios/correlativos.api';
import {
  contarHuecos,
  estadoDelCorrelativo,
  textoDeLaAccion,
  tituloDeCorrelativo,
  totalesDelReporte,
} from './resumen-de-correlativos';

const explicado: Hueco = {
  numero: 2,
  estado: 'explicado',
  explicaciones: [
    { accion: 'eliminar', usuarioId: 'u1', usuarioNombre: 'Ana', fecha: '2026-09-01T10:00:00Z', motivo: 'Duplicada' },
  ],
};
const alerta: Hueco = { numero: 5, estado: 'alerta', explicaciones: [] };

const correlativo = (huecos: Hueco[], anio = 0): Correlativo => ({
  clave: 'bancos.notas_de_credito',
  nombre: 'Notas de crédito',
  anio,
  ultimo: 6,
  emitidos: 6 - huecos.length,
  huecos,
});

describe('tituloDeCorrelativo', () => {
  it('lleva el año solo si la empresa reinicia por año', () => {
    expect(tituloDeCorrelativo(correlativo([]))).toBe('Notas de crédito');
    expect(tituloDeCorrelativo(correlativo([], 2026))).toBe('Notas de crédito 2026');
  });
});

describe('contarHuecos y estado', () => {
  it('sin huecos está completo', () => {
    expect(contarHuecos(correlativo([]))).toEqual({ huecos: 0, alertas: 0 });
    expect(estadoDelCorrelativo(correlativo([]))).toBe('completo');
  });

  it('con huecos explicados está explicado', () => {
    expect(estadoDelCorrelativo(correlativo([explicado]))).toBe('explicado');
  });

  it('un solo hueco sin auditoría lo pone en alerta', () => {
    expect(contarHuecos(correlativo([explicado, alerta]))).toEqual({ huecos: 2, alertas: 1 });
    expect(estadoDelCorrelativo(correlativo([explicado, alerta]))).toBe('alerta');
  });
});

describe('totalesDelReporte', () => {
  it('suma los huecos y las alertas de todos los correlativos', () => {
    const total = totalesDelReporte([correlativo([explicado, alerta]), correlativo([alerta], 2026), correlativo([])]);
    expect(total).toEqual({ huecos: 3, alertas: 2 });
  });
});

describe('textoDeLaAccion', () => {
  it('nombra lo que se hizo con el comprobante', () => {
    expect(textoDeLaAccion('eliminar')).toBe('Eliminado');
    expect(textoDeLaAccion('corregir')).toBe('Cambió de tipo');
  });
});
