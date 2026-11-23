import { describe, expect, it } from 'vitest';
import type { CifrasDeVentasEnLaFoto } from './foto-del-periodo.js';
import { calcularRemanentesDeRetenciones, esFormularioConRemanente } from './remanentes-de-retenciones.js';

const ventas = (cifras: Record<string, string>): CifrasDeVentasEnLaFoto[] => [
  {
    modulo: 'libro-de-ventas',
    clave: 'ventas',
    cifras: Object.entries(cifras).map(([clave, valor]) => ({ clave, etiqueta: clave, tipo: 'monto', valor })),
  },
];

describe('remanente de retenciones del SAT-2237', () => {
  const calcular = (cifras: Record<string, string>, creditoCentavos: number, anteriorCentavos: number) =>
    calcularRemanentesDeRetenciones({
      formulario: 'SAT-2237',
      ventas: ventas(cifras),
      creditoCentavos,
      anteriorCentavos,
    });

  it('las retenciones que pasan del impuesto del mes se trasladan al siguiente', () => {
    const resultado = calcular({ debito: '1200.00', retenciones_de_iva: '500.00' }, 90000, 10000);

    expect(resultado).toEqual({
      formulario: 'SAT-2237',
      retencionesDelPeriodo: '500.00',
      remanenteAnterior: '100.00',
      impuestoDelMes: '300.00',
      impuestoAPagar: '0.00',
      remanenteAlSiguiente: '300.00',
    });
  });

  it('si las retenciones no alcanzan queda impuesto por pagar y ningún remanente', () => {
    const resultado = calcular({ debito: '1200.00', retenciones_de_iva: '100.00' }, 0, 50000);

    expect(resultado).toMatchObject({
      impuestoDelMes: '1200.00',
      impuestoAPagar: '600.00',
      remanenteAlSiguiente: '0.00',
    });
  });

  it('con más crédito que débito el impuesto es cero y todo lo retenido pasa al siguiente', () => {
    const resultado = calcular({ debito: '100.00', retenciones_de_iva: '40.50' }, 25000, 0);

    expect(resultado).toMatchObject({ impuestoDelMes: '0.00', impuestoAPagar: '0.00', remanenteAlSiguiente: '40.50' });
  });

  it('suma lo que responden varios módulos y no se confunde con otras claves', () => {
    const dos = [...ventas({ debito: '10.00', retenciones_de_iva: '1.10' }), ...ventas({ retenciones_de_iva: '2.20' })];

    const resultado = calcularRemanentesDeRetenciones({
      formulario: 'SAT-2237',
      ventas: dos,
      creditoCentavos: 0,
      anteriorCentavos: 0,
    });

    expect(resultado?.retencionesDelPeriodo).toBe('3.30');
  });

  it('sin respuesta de ventas no hay remanente', () => {
    expect(
      calcularRemanentesDeRetenciones({ formulario: 'SAT-2237', ventas: [], creditoCentavos: 0, anteriorCentavos: 0 }),
    ).toBeNull();
  });
});

describe('saldo de constancias del SAT-2046', () => {
  const calcular = (cifras: Record<string, string>, anteriorCentavos: number) =>
    calcularRemanentesDeRetenciones({
      formulario: 'SAT-2046',
      ventas: ventas(cifras),
      creditoCentavos: 0,
      anteriorCentavos,
    });

  it('el impuesto es el 5 % de los ingresos menos las constancias y el saldo anterior', () => {
    expect(calcular({ ingresos: '10000.00', retenciones_de_iva: '200.00' }, 100)).toEqual({
      formulario: 'SAT-2046',
      retencionesDelPeriodo: '200.00',
      remanenteAnterior: '1.00',
      impuestoDelMes: '500.00',
      impuestoAPagar: '299.00',
      remanenteAlSiguiente: '0.00',
    });
  });

  it('las constancias que pasan del 5 % quedan como saldo para el mes siguiente', () => {
    const resultado = calcular({ ingresos: '1000.00', retenciones_de_iva: '80.00' }, 0);

    expect(resultado).toMatchObject({ impuestoDelMes: '50.00', impuestoAPagar: '0.00', remanenteAlSiguiente: '30.00' });
  });

  it('el 5 % se redondea al centavo sin decimales flotantes', () => {
    expect(calcular({ ingresos: '0.30', retenciones_de_iva: '0.00' }, 0)?.impuestoDelMes).toBe('0.02');
  });
});

describe('formularios con remanente', () => {
  it('solo el SAT-2237 y el SAT-2046', () => {
    expect(['SAT-2237', 'SAT-2046', 'sin_formulario', null].map(esFormularioConRemanente)).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });
});
