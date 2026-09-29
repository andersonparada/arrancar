import { describe, expect, it } from 'vitest';
import { sePuedeOfrecer } from './conceptos-ofrecibles.js';

const concepto = (cambios: Record<string, unknown> = {}) => ({
  aplicaA: 'ambos' as const,
  activo: true,
  claveDeSistema: null as string | null,
  ...cambios,
});

describe('sePuedeOfrecer', () => {
  it('ofrece los activos, no de sistema y compatibles con la dirección', () => {
    expect(sePuedeOfrecer(concepto(), 'debito', false)).toBe(true);
    expect(sePuedeOfrecer(concepto({ aplicaA: 'credito' }), 'debito', false)).toBe(false);
    expect(sePuedeOfrecer(concepto({ aplicaA: 'debito' }), 'cheque', false)).toBe(true);
    expect(sePuedeOfrecer(concepto({ activo: false }), 'debito', false)).toBe(false);
    expect(sePuedeOfrecer(concepto({ claveDeSistema: 'sin_clasificar' }), 'debito', false)).toBe(false);
  });

  it('«Pago a proveedores» solo a un cheque y sin Cuentas por pagar', () => {
    const pago = concepto({ aplicaA: 'debito', claveDeSistema: 'pago_a_proveedor' });
    expect(sePuedeOfrecer(pago, 'cheque', false)).toBe(true);
    expect(sePuedeOfrecer(pago, 'cheque', true)).toBe(false);
    expect(sePuedeOfrecer(pago, 'debito', false)).toBe(false);
  });
});
