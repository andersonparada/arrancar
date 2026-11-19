import { describe, expect, it } from 'vitest';
import type { PlazoDeProveedor } from '../../servicios/plazos.api';
import {
  detallesDelPlazo,
  filtrarPlazos,
  ordenarPorProveedor,
  textoDeLosDias,
  textoDesdeCuando,
} from './reglas-de-plazos';

const plazo = (proveedorNombre: string, nit: string | null = null, dias: number | null = 30): PlazoDeProveedor => ({
  proveedorId: proveedorNombre,
  nit,
  proveedorNombre,
  diasDeCredito: dias,
  contarDesdeLaRecepcion: false,
});

describe('textos de los plazos', () => {
  it('lee los días, el contado y el plazo por omisión', () => {
    expect(textoDeLosDias(30)).toBe('30 días');
    expect(textoDeLosDias(1)).toBe('1 día');
    expect(textoDeLosDias(0)).toBe('De contado');
    expect(textoDeLosDias(null)).toBe('Plazo por omisión de la empresa');
  });

  it('dice desde cuándo corren', () => {
    expect(textoDesdeCuando(true)).toBe('La recepción');
    expect(textoDesdeCuando(false)).toBe('La emisión');
  });

  it('la tarjeta muestra «Sin NIT» cuando no tiene', () => {
    expect(detallesDelPlazo(plazo('Ana')).map((d) => d.valor)).toEqual(['Sin NIT', '30 días', 'La emisión']);
  });
});

describe('lista de plazos', () => {
  it('ordena por nombre sin cambiar la lista original', () => {
    const original = [plazo('Zeta'), plazo('Álamo'), plazo('Beta')];
    expect(ordenarPorProveedor(original).map((p) => p.proveedorNombre)).toEqual(['Álamo', 'Beta', 'Zeta']);
    expect(original[0]?.proveedorNombre).toBe('Zeta');
  });

  it('busca por nombre sin tildes ni mayúsculas, o por NIT', () => {
    const lista = [plazo('Distribuidora Álvarez', '1234567-8'), plazo('Beta', '99-1')];
    expect(filtrarPlazos(lista, 'alvarez')).toHaveLength(1);
    expect(filtrarPlazos(lista, '99')).toHaveLength(1);
    expect(filtrarPlazos(lista, '  ')).toHaveLength(2);
    expect(filtrarPlazos(lista, 'nadie')).toHaveLength(0);
  });
});
