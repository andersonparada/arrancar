import { describe, expect, it } from 'vitest';
import { CalendarioLaboral as CalendarioDelCore } from '../../core/calendario/aplicacion/calendario-laboral.js';
import { fechaLimiteDeEntero } from '../dominio/plazo-de-entero.js';
import { CalendarioDeFeriados } from './calendario-de-feriados.js';

const sinAsuetos = { delAnio: async () => [] };
const fuente = new CalendarioDeFeriados(new CalendarioDelCore(sinAsuetos));

describe('CalendarioDeFeriados (feriados del core para el dominio síncrono)', () => {
  it('descuenta los feriados y los fines de semana', async () => {
    const calendario = await fuente.paraAnios([2026]);

    expect(calendario.esHabil('2026-10-19')).toBe(true);
    expect(calendario.esHabil('2026-10-20')).toBe(false); // Revolución de 1944
    expect(calendario.esHabil('2026-10-24')).toBe(false); // sábado
  });

  it('la retención de IVA de septiembre de 2026 se entera el 22 de octubre (día hábil 15), no el 21', async () => {
    const calendario = await fuente.paraAnios([2026, 2027]);

    const limite = fechaLimiteDeEntero({ fechaDeLaRetencion: '2026-09-15', diasHabiles: 15, calendario });

    expect(limite).toBe('2026-10-22');
  });

  it('pasar de diciembre a enero usa el año siguiente precargado', async () => {
    const calendario = await fuente.paraAnios([2026, 2027]);

    expect(fechaLimiteDeEntero({ fechaDeLaRetencion: '2026-12-10', diasHabiles: 3, calendario })).toBe('2027-01-06');
  });

  it('pedir un año que no se precargó es un error de programación, no un día hábil', async () => {
    const calendario = await fuente.paraAnios([2026]);

    expect(() => calendario.esHabil('2027-01-04')).toThrow(/no se precargó/);
  });
});
