import { describe, expect, it } from 'vitest';
import { instruccionesDe } from '../../core/intercambio/aplicacion/instrucciones.js';
import {
  columnasDeSaldosIniciales,
  esquemaDeSaldoInicialEnExcel,
  NOTAS_DE_SALDOS_INICIALES,
} from './saldos-iniciales.columnas.js';

const solicitud = {
  proveedorId: crypto.randomUUID(),
  tipo: 'factura',
  serie: null,
  numero: '10',
  fechaEmision: '2025-12-20',
  vencimiento: null,
  total: '100',
  saldoPendiente: '100',
  referencia: null,
};

describe('columnas del Excel de saldos iniciales', () => {
  const columnas = columnasDeSaldosIniciales({ proveedorId: async () => [] });

  it('siguen el orden del formulario y el proveedor también se escribe por su NIT', () => {
    expect(columnas.map((columna) => columna.clave)).toEqual([
      'proveedorId',
      'tipo',
      'serie',
      'numero',
      'referencia',
      'fechaEmision',
      'vencimiento',
      'total',
      'retenciones',
      'retencionesPorPracticar',
      'saldoPendiente',
      'tieneActivoFijo',
    ]);
    expect(columnas[0]).toMatchObject({ tipo: 'referencia', tambienPorCodigo: true });
  });

  it('la hoja de instrucciones lleva las notas del contador al final', () => {
    const hoja = instruccionesDe(columnas, NOTAS_DE_SALDOS_INICIALES);

    expect(hoja.at(-1)).toEqual(['Solo quetzales.']);
    expect(hoja).toHaveLength(1 + columnas.length + 1 + NOTAS_DE_SALDOS_INICIALES.length);
  });

  it('las retenciones vacías (null) valen cero y las escritas se respetan', () => {
    const vacias = esquemaDeSaldoInicialEnExcel.parse({
      ...solicitud,
      retenciones: null,
      retencionesPorPracticar: null,
    });
    const escritas = esquemaDeSaldoInicialEnExcel.parse({ ...solicitud, retenciones: '12.5' });

    expect(vacias).toMatchObject({ retenciones: '0.00', retencionesPorPracticar: '0.00', tieneActivoFijo: false });
    expect(escritas).toMatchObject({ retenciones: '12.5' });
  });
});
