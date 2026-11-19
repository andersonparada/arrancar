import { describe, expect, it } from 'vitest';
import {
  AVISO_DE_DATOS_FISCALES_EN_EFECTIVO,
  evaluarBancarizacionEnEfectivo,
  type CargoDelPagoEnEfectivo,
  type EntradaDeBancarizacionEnEfectivo,
} from './bancarizacion-en-efectivo.js';

const GENERAL = { iva: true, isr: true };
const cargo = (cambios: Partial<CargoDelPagoEnEfectivo> = {}): CargoDelPagoEnEfectivo => ({
  etiqueta: 'A-1',
  totalCentavos: 100_000,
  efecto: GENERAL,
  esSaldoInicial: false,
  ...cambios,
});
const entrada = (cambios: Partial<EntradaDeBancarizacionEnEfectivo> = {}): EntradaDeBancarizacionEnEfectivo => ({
  proveedorNombre: 'Alfa S.A.',
  fecha: '2026-11-10',
  umbralCentavos: 3_000_000,
  montoDelPagoCentavos: 100_000,
  pagadoEnElMesCentavos: 0,
  cargos: [cargo()],
  ...cambios,
});
const mensaje = (r: ReturnType<typeof evaluarBancarizacionEnEfectivo>) => (r as { mensaje: string }).mensaje;

describe('bancarización de un pago en efectivo', () => {
  it('bajo el umbral no pasa nada', () => {
    expect(evaluarBancarizacionEnEfectivo(entrada())).toEqual({ tipo: 'libre' });
  });

  it('un cargo del umbral o más, aunque se pague por partes, bloquea y nombra el documento', () => {
    const r = evaluarBancarizacionEnEfectivo(entrada({ cargos: [cargo({ totalCentavos: 3_000_000 })] }));
    expect(r.tipo).toBe('bloquear');
    expect(mensaje(r)).toContain('el documento A-1 es de Q30,000.00 o más');
  });

  it('el mes que llega al umbral bloquea y dice el mes y la suma', () => {
    const r = evaluarBancarizacionEnEfectivo(entrada({ pagadoEnElMesCentavos: 2_950_000 }));
    expect(mensaje(r)).toContain('en 11/2026 llega a Q30,500.00');
  });

  it('solo nombra lo que la empresa pierde', () => {
    const grande = { totalCentavos: 3_000_000 };
    const soloIva = evaluarBancarizacionEnEfectivo(
      entrada({ cargos: [cargo({ ...grande, efecto: { iva: true, isr: false } })] }),
    );
    const soloIsr = evaluarBancarizacionEnEfectivo(
      entrada({ cargos: [cargo({ ...grande, efecto: { iva: false, isr: true } })] }),
    );
    expect(mensaje(soloIva)).toContain('no es crédito fiscal');
    expect(mensaje(soloIva)).not.toContain('deducible');
    expect(mensaje(soloIsr)).toContain('no es deducible del ISR');
    expect(mensaje(soloIsr)).not.toContain('crédito fiscal');
  });

  it('sin efecto fiscal no avisa ni bloquea, y sin datos fiscales solo avisa', () => {
    const grande = { totalCentavos: 3_000_000 };
    const sinEfecto = evaluarBancarizacionEnEfectivo(
      entrada({ cargos: [cargo({ ...grande, efecto: { iva: false, isr: false } })] }),
    );
    const sinDatos = evaluarBancarizacionEnEfectivo(entrada({ cargos: [cargo({ ...grande, efecto: null })] }));
    expect(sinEfecto).toEqual({ tipo: 'libre' });
    expect(sinDatos).toEqual({ tipo: 'avisar', mensaje: AVISO_DE_DATOS_FISCALES_EN_EFECTIVO });
  });

  it('un saldo inicial con IVA dice «si tomó el crédito fiscal»', () => {
    const r = evaluarBancarizacionEnEfectivo(
      entrada({ cargos: [cargo({ totalCentavos: 3_000_000, esSaldoInicial: true })] }),
    );
    expect(mensaje(r)).toContain('si tomó el crédito fiscal');
  });
});
