import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { HallazgoDeCierre } from '../../servicios/tipos-de-saldos-iniciales';
import {
  agruparHallazgos,
  detallesDeLaCuenta,
  ordenarCuentasPorNombre,
  permisosDeIntercambio,
  sePuedeCargar,
  situacionDeLaApertura,
} from './detalles-de-saldos-iniciales';
import { resumenDeEjemplo } from './ejemplos-de-saldos-iniciales';

// Los detalles dan formato con `formatearMonto`, que lee la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const hallazgo = (cambios: Partial<HallazgoDeCierre>): HallazgoDeCierre => ({
  cuentaBancariaId: 'cuenta-1',
  cuentaNombre: 'Monetaria',
  codigo: 'no_cuadra',
  mensaje: 'no cuadra',
  pideMotivo: true,
  ...cambios,
});

describe('sePuedeCargar y permisosDeIntercambio', () => {
  it('solo con fecha de inicio y la carga abierta', () => {
    expect(sePuedeCargar(null)).toBe(false);
    expect(sePuedeCargar({ fechaDeInicio: null, cargaCerrada: false })).toBe(false);
    expect(sePuedeCargar({ fechaDeInicio: '2027-01-01', cargaCerrada: true })).toBe(false);
    expect(sePuedeCargar({ fechaDeInicio: '2027-01-01', cargaCerrada: false })).toBe(true);
  });

  it('exportar siempre; importar solo mientras se puede cargar', () => {
    expect(permisosDeIntercambio(false)).toEqual({ exportar: 'bancos.saldos-iniciales.exportar' });
    expect(permisosDeIntercambio(true)).toEqual({
      exportar: 'bancos.saldos-iniciales.exportar',
      importar: 'bancos.saldos-iniciales.importar',
    });
  });
});

describe('situacionDeLaApertura', () => {
  it('distingue sin fecha de inicio, abierta y cerrada', () => {
    expect(situacionDeLaApertura({ fechaDeInicio: null, cargaCerrada: false }).situacion).toBe('sin_fecha');
    expect(situacionDeLaApertura({ fechaDeInicio: '2027-01-01', cargaCerrada: false }).situacion).toBe('abierta');
    const cerrada = situacionDeLaApertura({ fechaDeInicio: '2027-01-01', cargaCerrada: true });
    expect(cerrada.situacion).toBe('cerrada');
    expect(cerrada.ayuda).toContain('reabran');
  });
});

describe('ordenarCuentasPorNombre', () => {
  it('ordena por nombre sin tocar la lista original', () => {
    const original = [
      resumenDeEjemplo({ cuentaNombre: 'Óptima' }),
      resumenDeEjemplo({ cuentaNombre: 'Ahorro' }),
      resumenDeEjemplo({ cuentaNombre: 'Monetaria' }),
    ];
    expect(ordenarCuentasPorNombre(original).map((cuenta) => cuenta.cuentaNombre)).toEqual([
      'Ahorro',
      'Monetaria',
      'Óptima',
    ]);
    expect(original[0]?.cuentaNombre).toBe('Óptima');
  });
});

describe('detallesDeLaCuenta', () => {
  it('sin saldo inicial dice que no lleva si la cuenta se abrió después', () => {
    const [detalle] = detallesDeLaCuenta(resumenDeEjemplo({ forma: 'sin_saldo' }));
    expect(detalle?.valor).toContain('se abrió después de la fecha de inicio');
  });

  it('con saldo muestra el del estado de cuenta, los libros anteriores y la diferencia', () => {
    const etiquetas = detallesDeLaCuenta(resumenDeEjemplo({ cuadra: false, diferencia: '25.00' })).map(
      (detalle) => detalle.etiqueta,
    );
    expect(etiquetas).toEqual([
      'Saldo según el estado de cuenta',
      'Saldo de la cuenta contable en los libros anteriores',
      'Diferencia',
    ]);
  });
});

describe('agruparHallazgos', () => {
  it('separa los que piden motivo de los que solo avisan', () => {
    const grupos = agruparHallazgos([
      hallazgo({}),
      hallazgo({ codigo: 'sin_evidencia', pideMotivo: false }),
      hallazgo({ codigo: 'sin_dato_de_libros' }),
    ]);
    expect(grupos.conMotivo.map((h) => h.codigo)).toEqual(['no_cuadra', 'sin_dato_de_libros']);
    expect(grupos.avisos.map((h) => h.codigo)).toEqual(['sin_evidencia']);
  });
});
