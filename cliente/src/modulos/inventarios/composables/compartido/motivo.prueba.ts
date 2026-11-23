import { describe, expect, it } from 'vitest';
import { faltaElMotivo, motivoVacio } from './motivo';

describe('motivo de una acción', () => {
  it('empieza cerrada y vacía', () => {
    expect(motivoVacio()).toEqual({ abierta: false, motivo: '' });
  });

  it('sin motivo o solo con espacios dice qué escribir', () => {
    expect(faltaElMotivo({ abierta: true, motivo: '   ' }).motivo).toMatch(/Escriba el motivo/);
    expect(faltaElMotivo({ abierta: true, motivo: 'Duplicado' })).toEqual({});
  });
});
