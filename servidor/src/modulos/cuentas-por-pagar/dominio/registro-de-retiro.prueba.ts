import { describe, expect, it } from 'vitest';
import {
  BeneficiarioDelRetiroInvalido,
  CustodioObligatorio,
  FechaDeRetiroInvalida,
  MontoDeRetiroInvalido,
} from './errores-de-retiros.js';
import {
  beneficiarioDelRetiro,
  exigirFechaDeRetiro,
  exigirMontoDeRetiro,
  nombreDelCustodio,
} from './registro-de-retiro.js';

describe('a nombre de quién va el cheque del retiro', () => {
  it('por omisión es el custodio y se puede escribir otro nombre', () => {
    expect(beneficiarioDelRetiro(undefined, 'Juan Pérez')).toBe('Juan Pérez');
    expect(beneficiarioDelRetiro(null, 'Juan Pérez')).toBe('Juan Pérez');
    expect(beneficiarioDelRetiro('  Rancho, S.A.  ', 'Juan Pérez')).toBe('Rancho, S.A.');
  });

  it.each(['', '   ', 'Al Portador', ' AL  PORTADOR. ', 'Portador', 'al-portador', 'ALPORTADOR', 'Al Pórtador'])(
    'rechaza «%s»: sin nombre o al portador',
    (escrito) => {
      expect(() => beneficiarioDelRetiro(escrito, 'Juan Pérez')).toThrow(BeneficiarioDelRetiroInvalido);
    },
  );

  it('no confunde un nombre que contiene la palabra con «al portador»', () => {
    expect(beneficiarioDelRetiro('Transportes El Portador, S.A.', 'Juan')).toBe('Transportes El Portador, S.A.');
  });
});

describe('quién lleva el efectivo', () => {
  it('el nombre del usuario manda sobre el texto y el texto se limpia', () => {
    expect(nombreDelCustodio('Otro', 'Ana López')).toBe('Ana López');
    expect(nombreDelCustodio('  Juan Pérez ', null)).toBe('Juan Pérez');
  });

  it('exige un nombre de hasta 150 letras', () => {
    expect(() => nombreDelCustodio(undefined, null)).toThrow(CustodioObligatorio);
    expect(() => nombreDelCustodio('   ', null)).toThrow(CustodioObligatorio);
    expect(nombreDelCustodio('x'.repeat(200), null)).toHaveLength(150);
  });
});

describe('la fecha y el monto', () => {
  it('la fecha no puede ser posterior a hoy', () => {
    expect(() => exigirFechaDeRetiro('2026-11-16', '2026-11-15')).toThrow(FechaDeRetiroInvalida);
    expect(() => exigirFechaDeRetiro('2026-11-15', '2026-11-15')).not.toThrow();
    expect(() => exigirFechaDeRetiro('2026-10-01', '2026-11-15')).not.toThrow();
  });

  it('el monto es mayor que cero', () => {
    expect(() => exigirMontoDeRetiro(0)).toThrow(MontoDeRetiroInvalido);
    expect(exigirMontoDeRetiro(1)).toBe(1);
  });
});
