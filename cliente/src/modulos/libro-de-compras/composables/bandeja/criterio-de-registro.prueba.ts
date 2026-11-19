import { describe, expect, it } from 'vitest';
import { centavosConSigno, clasesDeDocumentos, seRegistraSegunLaSat, totalConSigno } from './criterio-de-registro';

describe('criterio de registro', () => {
  it('la nota de crédito resta venga en positivo o en negativo', () => {
    expect(centavosConSigno('30.00', 'NCRE')).toBe(-3000);
    expect(centavosConSigno('-30.00', 'NCRE')).toBe(-3000);
    expect(centavosConSigno('30.00', 'NDEB')).toBe(3000);
    expect(centavosConSigno('30.00', 'FACT')).toBe(3000);
  });

  it('suma con signo', () => {
    const total = totalConSigno([
      { total: '100.10', tipoDte: 'FACT' },
      { total: '30.00', tipoDte: 'NCRE' },
      { total: '5.05', tipoDte: 'NDEB' },
    ]);
    expect(total).toBe('75.15');
  });

  it('solo el anulado en la SAT queda fuera', () => {
    expect(seRegistraSegunLaSat('anulado')).toBe(false);
    expect(seRegistraSegunLaSat('vigente')).toBe(true);
  });

  it('cuenta facturas y notas', () => {
    expect(clasesDeDocumentos(['FACT', 'NCRE', 'FCAM', 'NDEB', 'NCRE'])).toEqual({
      facturas: 2,
      notasDeCredito: 2,
      notasDeDebito: 1,
    });
  });
});
