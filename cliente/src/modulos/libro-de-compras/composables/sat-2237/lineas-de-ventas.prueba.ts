import { describe, expect, it } from 'vitest';
import type { RemanentesDeRetenciones, RespuestaDeVentas } from '../../servicios/sat-2237.api';
import { cifrasDeVentas, lineasDeRemanente, lineasPorConfirmar } from './lineas-de-ventas';

const remanentes = (formulario: RemanentesDeRetenciones['formulario']): RemanentesDeRetenciones => ({
  formulario,
  retencionesDelPeriodo: '100.00',
  remanenteAnterior: '25.00',
  impuestoDelMes: '60.00',
  impuestoAPagar: '0.00',
  remanenteAlSiguiente: '65.00',
});

describe('líneas del remanente', () => {
  it('el SAT-2237 habla de retenciones y resalta lo que se paga y lo que se traslada', () => {
    const lineas = lineasDeRemanente(remanentes('SAT-2237'));

    expect(lineas.map((linea) => linea.valor)).toEqual(['100.00', '25.00', '60.00', '0.00', '65.00']);
    expect(lineas[0]?.etiqueta).toBe('Retenciones del período');
    expect(lineas.filter((linea) => linea.destacada).map((linea) => linea.valor)).toEqual(['0.00', '65.00']);
  });

  it('el SAT-2237 con crédito fiscal muestra lo que traía y lo que pasa al mes siguiente; el SAT-2046 no', () => {
    const conCredito = { creditoAnterior: '10.00', creditoAlSiguiente: '7.00' };

    const lineas = lineasDeRemanente({ ...remanentes('SAT-2237'), ...conCredito });

    expect(lineas.map((linea) => linea.valor)).toEqual(['100.00', '25.00', '10.00', '60.00', '0.00', '65.00', '7.00']);
    expect(lineasDeRemanente({ ...remanentes('SAT-2046'), ...conCredito })).toHaveLength(5);
  });

  it('el SAT-2046 habla de constancias', () => {
    const lineas = lineasDeRemanente(remanentes('SAT-2046'));

    expect(lineas[0]?.etiqueta).toBe('Constancias del período');
    expect(lineas.at(-1)?.etiqueta).toBe('Saldo de constancias para el mes siguiente');
  });
});

describe('cifras por confirmar', () => {
  it('sin el saldo del mes anterior, el impuesto por pagar y lo que pasa al mes siguiente no llevan monto', () => {
    const lineas = lineasPorConfirmar('SAT-2237');

    expect(lineas.map((linea) => linea.valor)).toEqual([null, null]);
    expect(lineas[1]?.etiqueta).toBe('Remanente de retenciones para el mes siguiente');
    expect(lineasPorConfirmar('SAT-2046')[1]?.etiqueta).toBe('Saldo de constancias para el mes siguiente');
  });
});

describe('cifras de ventas', () => {
  it('junta las cifras de todos los módulos que respondieron', () => {
    const respuestas: RespuestaDeVentas[] = [
      { modulo: 'a', clave: 'ventas', cifras: [{ clave: 'debito', etiqueta: 'Débito', tipo: 'monto', valor: '1.00' }] },
      { modulo: 'b', clave: 'ventas', cifras: [{ clave: 'n', etiqueta: 'Operaciones', tipo: 'cantidad', valor: '3' }] },
    ];

    expect(cifrasDeVentas(respuestas).map((cifra) => cifra.clave)).toEqual(['debito', 'n']);
    expect(cifrasDeVentas([])).toEqual([]);
  });
});
