import { describe, expect, it } from 'vitest';
import { efectivoEsperado, montoDelFondo } from './monto-del-fondo.js';
import {
  beneficiarioDelFondo,
  depositoAlCerrar,
  descripcionDelUso,
  exigirAperturaVigente,
  exigirDisminucionPosible,
  exigirFechaNoFutura,
  exigirFondoAbierto,
  exigirFondoSinUso,
  exigirMontoPositivo,
  exigirNombreDelFondo,
  exigirTope,
  fechaDeAnulacionDelCambio,
  nombreDelCustodio,
} from './reglas-del-fondo.js';

const sinUso = { comprobantes: 0, arqueos: 0, reposiciones: 0, vales: 0 };

describe('monto y efectivo esperado', () => {
  it('suma la apertura y los aumentos vigentes y resta las disminuciones; ignora lo anulado y el cierre', () => {
    const cambios = [
      { tipo: 'apertura', estado: 'vigente', montoCentavos: 100_000 },
      { tipo: 'aumento', estado: 'vigente', montoCentavos: 20_000 },
      { tipo: 'aumento', estado: 'anulado', montoCentavos: 5_000 },
      { tipo: 'disminucion', estado: 'vigente', montoCentavos: 30_000 },
      { tipo: 'cierre', estado: 'vigente', montoCentavos: 90_000 },
    ] as const;

    expect(montoDelFondo(cambios)).toBe(90_000);
  });

  it('el efectivo esperado es el monto menos lo pendiente y los vales abiertos', () => {
    expect(efectivoEsperado({ montoCentavos: 100_000, pendienteCentavos: 25_050, valesCentavos: 5_000 })).toBe(69_950);
  });
});

describe('datos del fondo', () => {
  it('el beneficiario del cheque es el escrito o el custodio, y nunca el portador', () => {
    expect(beneficiarioDelFondo(undefined, 'Juan Pérez')).toBe('Juan Pérez');
    expect(beneficiarioDelFondo(' Ferretería ', 'Juan Pérez')).toBe('Ferretería');
    for (const portador of ['', 'Al portador', 'AL  PORTADOR.', 'portador']) {
      expect(() => beneficiarioDelFondo(portador, 'Juan'), portador).toThrow(/portador/);
    }
  });

  it('el custodio es el nombre del usuario o el texto escrito, y no queda vacío', () => {
    expect(nombreDelCustodio('Otro', 'Ana López')).toBe('Ana López');
    expect(nombreDelCustodio('  María  ', null)).toBe('María');
    expect(() => nombreDelCustodio('  ', null)).toThrow(/quién lleva el efectivo/);
  });

  it('el nombre, el tope, el monto y la fecha se validan', () => {
    expect(exigirNombreDelFondo('  Caja  ')).toBe('Caja');
    expect(() => exigirNombreDelFondo(' ')).toThrow();
    expect(() => exigirNombreDelFondo('x'.repeat(81))).toThrow();
    expect(exigirTope(null)).toBeNull();
    expect(exigirTope(100)).toBe(100);
    expect(() => exigirTope(0)).toThrow();
    expect(exigirMontoPositivo(1)).toBe(1);
    expect(() => exigirMontoPositivo(0)).toThrow();
    expect(() => exigirFechaNoFutura('2026-11-19', '2026-11-18')).toThrow();
    expect(() => exigirFechaNoFutura('2026-11-18', '2026-11-18')).not.toThrow();
  });

  it('un fondo cerrado no está disponible', () => {
    expect(() => exigirFondoAbierto({ estado: 'cerrado' })).toThrow(/cerrado/);
    expect(() => exigirFondoAbierto({ estado: 'abierto' })).not.toThrow();
  });
});

describe('disminuir', () => {
  const datos = { montoCentavos: 40_000, esperadoCentavos: 60_000, fondoCentavos: 100_000 };

  it('deja devolver hasta el efectivo esperado y siempre queda algo en el fondo', () => {
    expect(() => exigirDisminucionPosible(datos)).not.toThrow();
    expect(() => exigirDisminucionPosible({ ...datos, montoCentavos: 60_001 })).toThrow(/Q 600\.00/);
    expect(() =>
      exigirDisminucionPosible({ montoCentavos: 100_000, esperadoCentavos: 100_000, fondoCentavos: 100_000 }),
    ).toThrow(/cierre el fondo/);
  });
});

describe('anular la apertura', () => {
  it('solo un fondo sin uso ni otros cambios; el mensaje dice lo que tiene', () => {
    expect(() => exigirFondoSinUso(sinUso)).not.toThrow();
    expect(() => exigirFondoSinUso({ ...sinUso, comprobantes: 2, vales: 1 })).toThrow(/2 comprobantes, 1 vale/);
    expect(() => exigirFondoSinUso(sinUso, 1)).toThrow(/1 cambio de monto/);
    expect(descripcionDelUso(sinUso)).toBeNull();
  });

  it('la apertura debe estar vigente', () => {
    expect(() => exigirAperturaVigente({ estado: 'vigente' })).not.toThrow();
    expect(() => exigirAperturaVigente({ estado: 'anulado' })).toThrow(/ya está anulada/);
    expect(() => exigirAperturaVigente(undefined)).toThrow();
  });

  it('la fecha contable: sin inverso la del cambio; con inverso la del inverso; sin Bancos, hoy sin pasar de la del cambio', () => {
    const base = { fecha: '2026-11-10', fechaDelInverso: null, hoy: '2026-11-18' };

    expect(fechaDeAnulacionDelCambio({ ...base, enBancos: 'sin_inverso' })).toBe('2026-11-10');
    expect(fechaDeAnulacionDelCambio({ ...base, enBancos: 'con_inverso', fechaDelInverso: '2026-11-15' })).toBe(
      '2026-11-15',
    );
    expect(fechaDeAnulacionDelCambio({ ...base, enBancos: null })).toBe('2026-11-18');
    expect(fechaDeAnulacionDelCambio({ ...base, enBancos: null, hoy: '2026-11-01' })).toBe('2026-11-10');
  });
});

describe('cerrar el fondo', () => {
  it('el depósito es el efectivo esperado: lo pendiente se liquida aparte', () => {
    expect(depositoAlCerrar({ montoCentavos: 100_000, pendienteCentavos: 30_000, valesCentavos: 0 })).toBe(70_000);
    expect(depositoAlCerrar({ montoCentavos: 100_000, pendienteCentavos: 100_000, valesCentavos: 0 })).toBe(0);
  });

  it('con vales provisionales abiertos se rechaza', () => {
    expect(() => depositoAlCerrar({ montoCentavos: 100_000, pendienteCentavos: 0, valesCentavos: 5_000 })).toThrow(
      /vales provisionales abiertos por Q\s?50\.00/,
    );
  });

  it('con el efectivo esperado negativo se rechaza', () => {
    expect(() => depositoAlCerrar({ montoCentavos: 100_000, pendienteCentavos: 120_000, valesCentavos: 0 })).toThrow(
      /efectivo esperado es/,
    );
  });
});
