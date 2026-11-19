import { describe, expect, it } from 'vitest';
import {
  AVISO_DE_FACTURAS_A_NOMBRE_DE_LA_EMPRESA,
  avisoDeAnticipoVencido,
  avisoDeBeneficiarioConVencidos,
  quetzales,
} from './avisos-de-anticipos.js';
import { numeroDelAnticipo } from './anticipos.js';
import { diasEntre, fechaLegible, sumarDias } from './fechas.js';

describe('los avisos de los anticipos', () => {
  it('el aviso C8 pide facturas a nombre de la empresa', () => {
    expect(AVISO_DE_FACTURAS_A_NOMBRE_DE_LA_EMPRESA).toBe('Las facturas deben venir a nombre y NIT de la empresa.');
  });

  it('avisa de uno o varios vencidos', () => {
    expect(avisoDeBeneficiarioConVencidos('Ana', ['3'])).toBe('Ana tiene vencido el anticipo 3 sin liquidar.');
    expect(avisoDeBeneficiarioConVencidos('Ana', ['3', '2026-4'])).toBe(
      'Ana tiene vencidos los anticipos 3, 2026-4 sin liquidar.',
    );
  });

  it('el aviso del vencido dice la fecha límite y lo que falta', () => {
    const aviso = avisoDeAnticipoVencido(
      { numero: 5, anioDeNumero: 0, fechaLimite: '2026-11-05', beneficiario: 'Ana' },
      123_456,
    );
    expect(aviso).toBe('El anticipo 5 venció el 05/11/2026 y Ana aún tiene Q1,234.56 por justificar.');
  });

  it('los quetzales llevan miles y dos decimales', () => {
    expect(quetzales(5)).toBe('Q0.05');
    expect(quetzales(100_000_000)).toBe('Q1,000,000.00');
  });
});

describe('números y fechas', () => {
  it('el número lleva año solo si el correlativo se reinicia', () => {
    expect(numeroDelAnticipo(15, 0)).toBe('15');
    expect(numeroDelAnticipo(15, 2026)).toBe('2026-15');
  });

  it('suma días y cuenta la distancia entre fechas', () => {
    expect(sumarDias('2026-02-20', 15)).toBe('2026-03-07');
    expect(diasEntre('2026-11-10', '2026-11-25')).toBe(15);
    expect(diasEntre('2026-11-25', '2026-11-10')).toBe(-15);
    expect(fechaLegible('2026-01-09')).toBe('09/01/2026');
  });
});
