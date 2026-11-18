import { describe, expect, it } from 'vitest';
import { motivoSinCambioDeVencimiento } from './reglas-de-acciones';

describe('motivo de no cambiar el vencimiento', () => {
  const cargo = { puedeCambiarVencimiento: false, clase: 'cargo', estado: 'registrado', saldo: '0.00' } as const;

  it('un cargo vigente sin saldo explica por qué', () => {
    expect(motivoSinCambioDeVencimiento(cargo)).toContain('pagado');
    expect(motivoSinCambioDeVencimiento({ ...cargo, estado: 'autorizado' })).not.toBeNull();
  });

  it('si el servidor lo permite, o hay saldo, o no es un cargo vigente, no hay nada que explicar', () => {
    expect(motivoSinCambioDeVencimiento({ ...cargo, puedeCambiarVencimiento: true })).toBeNull();
    expect(motivoSinCambioDeVencimiento({ ...cargo, saldo: '10.00' })).toBeNull();
    expect(motivoSinCambioDeVencimiento({ ...cargo, clase: 'abono' })).toBeNull();
    expect(motivoSinCambioDeVencimiento({ ...cargo, estado: 'anulado' })).toBeNull();
  });
});
