import { describe, expect, it } from 'vitest';
import type { RemanentesDeRetenciones, RespuestaDeVentas } from '../../servicios/sat-2237.api';
import { cifrasDeVentas, lineasDeRemanente } from './lineas-de-ventas';

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

  it('el SAT-2046 habla de constancias', () => {
    const lineas = lineasDeRemanente(remanentes('SAT-2046'));

    expect(lineas[0]?.etiqueta).toBe('Constancias del período');
    expect(lineas.at(-1)?.etiqueta).toBe('Saldo de constancias para el mes siguiente');
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
