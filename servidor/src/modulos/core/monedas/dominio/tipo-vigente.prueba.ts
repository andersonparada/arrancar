import { describe, expect, it } from 'vitest';
import { clasificarTipo, diasEntre } from './tipo-vigente.js';

const base = { hoy: '2026-11-18', diaSinCalculo: false };

describe('clasificarTipo', () => {
  it('sin tipo no se puede usar', () => {
    expect(clasificarTipo({ ...base, fecha: '2026-11-17', fechaDelTipo: null }).utilizable).toBe(false);
  });

  it('el del mismo día es exacto', () => {
    expect(clasificarTipo({ ...base, fecha: '2026-11-17', fechaDelTipo: '2026-11-17' })).toEqual({
      utilizable: true,
      exacto: true,
      motivoDelAnterior: null,
    });
  });

  it('uno anterior de hasta 7 días se usa con su motivo; de 8 días no', () => {
    const siete = clasificarTipo({ ...base, fecha: '2026-11-17', fechaDelTipo: '2026-11-10' });
    const ocho = clasificarTipo({ ...base, fecha: '2026-11-17', fechaDelTipo: '2026-11-09' });

    expect(siete).toEqual({ utilizable: true, exacto: false, motivoDelAnterior: 'falta_publicacion' });
    expect(ocho.utilizable).toBe(false);
  });

  it('un día sin cálculo se marca así', () => {
    const resultado = clasificarTipo({ ...base, fecha: '2026-11-15', fechaDelTipo: '2026-11-13', diaSinCalculo: true });

    expect(resultado.motivoDelAnterior).toBe('dia_sin_calculo');
  });

  it('una fecha futura solo sirve si está publicada', () => {
    expect(clasificarTipo({ ...base, fecha: '2026-11-19', fechaDelTipo: '2026-11-18' }).utilizable).toBe(false);
    expect(clasificarTipo({ ...base, fecha: '2026-11-19', fechaDelTipo: '2026-11-19' }).utilizable).toBe(true);
  });
});

describe('diasEntre', () => {
  it('cuenta días de calendario, también entre meses y años', () => {
    expect(diasEntre('2026-11-10', '2026-11-17')).toBe(7);
    expect(diasEntre('2026-12-30', '2027-01-02')).toBe(3);
    expect(diasEntre('2026-02-28', '2026-03-01')).toBe(1);
  });
});
