import { describe, expect, it } from 'vitest';
import { sePuedeOfrecer } from './conceptos-ofrecibles.js';

const sinModulos = new Set<string>();
const conCuentasPorPagar = new Set(['cuentas-por-pagar']);

const concepto = (cambios: Record<string, unknown> = {}) => ({
  aplicaA: 'ambos' as const,
  activo: true,
  claveDeSistema: null as string | null,
  ...cambios,
});

describe('sePuedeOfrecer', () => {
  it('ofrece los activos, no de sistema y compatibles con la dirección', () => {
    expect(sePuedeOfrecer(concepto(), 'debito', sinModulos)).toBe(true);
    expect(sePuedeOfrecer(concepto({ aplicaA: 'credito' }), 'debito', sinModulos)).toBe(false);
    expect(sePuedeOfrecer(concepto({ aplicaA: 'debito' }), 'cheque', sinModulos)).toBe(true);
    expect(sePuedeOfrecer(concepto({ activo: false }), 'debito', sinModulos)).toBe(false);
    expect(sePuedeOfrecer(concepto({ claveDeSistema: 'sin_clasificar' }), 'debito', sinModulos)).toBe(false);
  });

  it('«Pago a proveedores» solo a un cheque y sin Cuentas por pagar', () => {
    const pago = concepto({ aplicaA: 'debito', claveDeSistema: 'pago_a_proveedor' });
    expect(sePuedeOfrecer(pago, 'cheque', sinModulos)).toBe(true);
    expect(sePuedeOfrecer(pago, 'cheque', conCuentasPorPagar)).toBe(false);
    expect(sePuedeOfrecer(pago, 'debito', sinModulos)).toBe(false);
  });

  it('los conceptos de Caja chica y de Cuentas por liquidar siguen el mismo trato con su módulo', () => {
    const fondo = concepto({ aplicaA: 'debito', claveDeSistema: 'fondo_de_caja_chica' });
    const anticipo = concepto({ aplicaA: 'debito', claveDeSistema: 'anticipo_por_liquidar' });
    expect(sePuedeOfrecer(fondo, 'cheque', sinModulos)).toBe(true);
    expect(sePuedeOfrecer(fondo, 'cheque', new Set(['caja-chica']))).toBe(false);
    expect(sePuedeOfrecer(anticipo, 'cheque', new Set(['caja-chica']))).toBe(true);
    expect(sePuedeOfrecer(anticipo, 'cheque', new Set(['cuentas-por-liquidar']))).toBe(false);
  });
});
