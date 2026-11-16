import { describe, expect, it } from 'vitest';
import { avisoDeRetiroDeMesAnterior } from './avisos-de-retiros.js';
import { disponibleDelRetiro, esDeMesAnterior, numeroDelRetiro, ultimoDiaDelMesAnterior } from './retiros.js';

describe('lo que queda del retiro', () => {
  it('es el monto menos lo pagado, lo devuelto y el faltante', () => {
    const retiro = { montoCentavos: 100000, devueltoCentavos: 30000, faltanteCentavos: 10000 };

    expect(disponibleDelRetiro(retiro, 60000)).toBe(0);
    expect(disponibleDelRetiro({ ...retiro, devueltoCentavos: 0, faltanteCentavos: 0 }, 25050)).toBe(74950);
  });
});

describe('los meses', () => {
  it('un retiro es de mes anterior si su mes es menor que el de hoy', () => {
    expect(esDeMesAnterior('2026-10-31', '2026-11-01')).toBe(true);
    expect(esDeMesAnterior('2026-11-01', '2026-11-30')).toBe(false);
    expect(esDeMesAnterior('2025-12-31', '2026-01-01')).toBe(true);
  });

  it('el último día del mes anterior', () => {
    expect(ultimoDiaDelMesAnterior('2026-11-15')).toBe('2026-10-31');
    expect(ultimoDiaDelMesAnterior('2026-01-02')).toBe('2025-12-31');
    expect(ultimoDiaDelMesAnterior('2024-03-10')).toBe('2024-02-29');
  });
});

describe('el número y el aviso de fin de mes', () => {
  it('el número lleva el año si la empresa reinicia cada año', () => {
    expect(numeroDelRetiro(15, 0)).toBe('15');
    expect(numeroDelRetiro(15, 2026)).toBe('2026-15');
  });

  it('el aviso dice el mes, lo que queda y quién tiene el efectivo', () => {
    const retiro = { numero: 4, anioDeNumero: 0, fecha: '2026-10-03', custodio: 'Ana López' };

    expect(avisoDeRetiroDeMesAnterior(retiro, 123456)).toBe(
      'El retiro 4 es de 10/2026 y aún tiene Q1,234.56 sin usar: liquídelo o úselo; ese efectivo es de la empresa y está a cargo de Ana López.',
    );
  });
});
