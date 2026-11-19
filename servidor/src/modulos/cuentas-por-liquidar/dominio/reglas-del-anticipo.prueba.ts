import { describe, expect, it } from 'vitest';
import type { Anticipo } from './anticipos.js';
import {
  beneficiarioDelCheque,
  exigirAnticipoAnulable,
  exigirFechaDelAnticipo,
  exigirMontoDelAnticipo,
  fechaDeAnulacionDelAnticipo,
  fechaLimiteDelAnticipo,
  motivoConVencidos,
  motivoValido,
} from './reglas-del-anticipo.js';

const anticipo = (cambios: Partial<Anticipo> = {}): Anticipo => ({
  id: 'a1',
  numero: 7,
  anioDeNumero: 0,
  beneficiarioId: 't1',
  beneficiario: 'Ana López',
  esEmpleado: true,
  beneficiarioUsuarioId: null,
  clase: 'viatico',
  descripcion: 'Viaje',
  localidadId: null,
  fecha: '2026-11-10',
  fechaLimite: '2026-11-25',
  montoCentavos: 100_000,
  forma: 'cheque',
  movimientoId: 'm1',
  motivoConVencidos: null,
  estado: 'abierto',
  fechaDeLiquidacion: null,
  devueltoCentavos: 0,
  movimientoDeDevolucionId: null,
  reembolsadoCentavos: 0,
  movimientoDeReembolsoId: null,
  noLiquidadoCentavos: 0,
  destinoDeNoLiquidado: null,
  cuotas: null,
  motivoDeNoLiquidado: null,
  fechaDeAnulacion: null,
  motivoDeAnulacion: null,
  ...cambios,
});

describe('el cheque del anticipo', () => {
  it('va a nombre del beneficiario', () => {
    expect(beneficiarioDelCheque('  Ana López ')).toBe('Ana López');
  });

  it.each(['', '   ', 'Al Portador', ' AL  portador. ', 'Portador'])('nunca al portador: «%s»', (nombre) => {
    expect(() => beneficiarioDelCheque(nombre)).toThrow('no se emite al portador');
  });
});

describe('la fecha y el monto', () => {
  it('la fecha no puede ser futura', () => {
    expect(() => exigirFechaDelAnticipo('2026-11-19', '2026-11-18')).toThrow('fecha futura');
    expect(() => exigirFechaDelAnticipo('2026-11-18', '2026-11-18')).not.toThrow();
  });

  it('el monto es mayor que cero', () => {
    expect(() => exigirMontoDelAnticipo(0)).toThrow('mayor que cero');
    expect(exigirMontoDelAnticipo(1)).toBe(1);
  });
});

describe('la fecha límite', () => {
  it('por omisión es la entrega más los días de la configuración', () => {
    expect(fechaLimiteDelAnticipo({ fecha: '2026-11-10', dias: 15 })).toBe('2026-11-25');
    expect(fechaLimiteDelAnticipo({ fecha: '2026-12-25', dias: 10 })).toBe('2027-01-04');
  });

  it('se puede escribir, pero no antes de la entrega', () => {
    expect(fechaLimiteDelAnticipo({ fecha: '2026-11-10', escrita: '2026-11-10', dias: 15 })).toBe('2026-11-10');
    expect(() => fechaLimiteDelAnticipo({ fecha: '2026-11-10', escrita: '2026-11-09', dias: 15 })).toThrow(
      'anterior a la entrega',
    );
  });
});

describe('el motivo', () => {
  it('va de 1 a 300 letras', () => {
    expect(motivoValido('  Por error ')).toBe('Por error');
    expect(() => motivoValido('   ')).toThrow('motivo');
    expect(() => motivoValido('x'.repeat(301))).toThrow('motivo');
  });
});

describe('entregar a quien tiene vencidos (CL-r)', () => {
  const base = { beneficiario: 'Ana López', vencidos: ['3'], bloquear: true, puedeConVencidos: false };

  it('sin vencidos o sin bloqueo no exige nada', () => {
    expect(motivoConVencidos({ ...base, vencidos: [] })).toBeNull();
    expect(motivoConVencidos({ ...base, bloquear: false })).toBeNull();
  });

  it('con bloqueo y sin permiso rechaza y nombra los anticipos', () => {
    expect(() => motivoConVencidos(base)).toThrow('Ana López tiene anticipos vencidos sin liquidar (3)');
  });

  it('con el permiso exige el motivo y lo devuelve para guardarlo', () => {
    const con = { ...base, puedeConVencidos: true };
    expect(() => motivoConVencidos({ ...con, motivo: '  ' })).toThrow('Escriba por qué');
    expect(motivoConVencidos({ ...con, motivo: ' Urgente ' })).toBe('Urgente');
  });
});

describe('anular un anticipo', () => {
  const libre = { gastosVigentes: 0, conciliado: false };

  it('se anula si está abierto, sin gastos y con el cheque sin cobrar', () => {
    expect(() => exigirAnticipoAnulable(anticipo(), libre)).not.toThrow();
  });

  it.each([
    [{ estado: 'anulado' as const }, libre, 'ya está anulado'],
    [{ estado: 'liquidado' as const }, libre, 'ya se liquidó'],
    [{}, { gastosVigentes: 2, conciliado: false }, 'tiene gastos'],
    [{}, { gastosVigentes: 0, conciliado: true }, 'ya pagó el cheque'],
  ])('se rechaza %#', (cambios, revision, mensaje) => {
    expect(() => exigirAnticipoAnulable(anticipo(cambios), revision)).toThrow(mensaje);
  });
});

describe('la fecha contable de la anulación', () => {
  const datos = { fechaDelInverso: null, hoy: '2026-11-18' };

  it('sin inverso vale la de la entrega: nunca existió', () => {
    expect(fechaDeAnulacionDelAnticipo(anticipo(), { ...datos, enBancos: 'sin_inverso' })).toBe('2026-11-10');
  });

  it('con inverso vale la del inverso', () => {
    const con = { ...datos, enBancos: 'con_inverso' as const };
    expect(fechaDeAnulacionDelAnticipo(anticipo(), { ...con, fechaDelInverso: '2026-11-15' })).toBe('2026-11-15');
    expect(fechaDeAnulacionDelAnticipo(anticipo(), con)).toBe('2026-11-18');
  });
});
