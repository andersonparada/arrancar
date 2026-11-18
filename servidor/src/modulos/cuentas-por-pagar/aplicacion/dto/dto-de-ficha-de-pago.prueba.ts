import { describe, expect, it } from 'vitest';
import type { FilaDeListaDePagos } from '../puertos/puertos-de-lista-de-pagos.js';
import { dtoDeResumenDePago, dtoDeRetencion, juntarPorContrasena } from './dto-de-ficha-de-pago.js';

const fila = (cambios: Partial<FilaDeListaDePagos> = {}): FilaDeListaDePagos => ({
  id: 'p1',
  numero: 15,
  anioDeNumero: 2026,
  proveedor: { id: 'v1', nombre: 'Proveedor', nit: '1234567' },
  contrasenas: [{ id: 'c1', numero: 3, anioDeNumero: 2026 }],
  forma: 'cheque',
  fecha: '2026-11-20',
  montoCentavos: 112000,
  estado: 'vigente',
  fechaDeAnulacion: null,
  movimiento: null,
  retiro: null,
  ...cambios,
});

describe('juntarPorContrasena', () => {
  it('junta las líneas de cada contraseña, en el orden en que aparece primero', () => {
    const lineas = [
      { contrasena: { id: 'b' }, n: 1 },
      { contrasena: { id: 'a' }, n: 2 },
      { contrasena: { id: 'b' }, n: 3 },
    ];

    expect(juntarPorContrasena(lineas).map(({ n }) => n)).toEqual([1, 3, 2]);
  });
});

describe('dtoDeRetencion', () => {
  it('sin número de constancia está por emitir', () => {
    const base = { impuesto: 'isr' as const, montoCentavos: 12550, fecha: '2026-11-01' };

    expect(dtoDeRetencion({ ...base, constanciaNumero: null })).toMatchObject({ monto: '125.50', porEmitir: true });
    expect(dtoDeRetencion({ ...base, constanciaNumero: 'C-1' })).toMatchObject({
      constanciaNumero: 'C-1',
      porEmitir: false,
    });
  });
});

describe('dtoDeResumenDePago', () => {
  it('formatea los números y marca el posfechado solo si está vigente y con fecha posterior a hoy', () => {
    expect(dtoDeResumenDePago(fila(), '2026-11-16')).toMatchObject({
      numero: '2026-15',
      contrasenas: [{ id: 'c1', numero: '2026-3' }],
      monto: '1120.00',
      posfechado: true,
    });
    expect(dtoDeResumenDePago(fila(), '2026-11-20').posfechado).toBe(false);
    expect(dtoDeResumenDePago(fila({ estado: 'anulado' }), '2026-11-16').posfechado).toBe(false);
  });

  it('un pago en efectivo trae su retiro con el número como se lee', () => {
    const retiro = { id: 'r1', numero: 4, anioDeNumero: 0, custodio: 'Juan' };

    expect(dtoDeResumenDePago(fila({ forma: 'efectivo', retiro }), '2026-11-16').retiro).toEqual({
      id: 'r1',
      numero: '4',
      custodio: 'Juan',
    });
  });
});
