import { describe, expect, it } from 'vitest';
import {
  avisosDeBancarizacion,
  AVISO_DE_DATOS_FISCALES,
  type EntradaDeBancarizacion,
} from './bancarizacion-de-pagos.js';

const UMBRAL = 3000000;
const entrada = (cambios: Partial<EntradaDeBancarizacion> = {}): EntradaDeBancarizacion => ({
  proveedorNombre: 'Proveedor S.A.',
  fecha: '2026-11-10',
  umbralCentavos: UMBRAL,
  montoDelPagoCentavos: 1000000,
  totalesDeLosCargosCentavos: [1000000],
  pagadoEnElMesCentavos: 0,
  efectivoDelMes: [],
  efectoDelPago: { iva: true, isr: true },
  ...cambios,
});

describe('el aviso de bancarización de un pago bancario', () => {
  it('no sale si ni el mes ni ningún cargo llegan al umbral', () => {
    expect(avisosDeBancarizacion(entrada())).toEqual([]);
  });

  it('sale si un cargo del pago es del umbral o más, aunque se pague por partes', () => {
    const avisos = avisosDeBancarizacion(entrada({ totalesDeLosCargosCentavos: [UMBRAL] }));

    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('Q30,000.00');
    expect(avisos[0]).toContain('no negociable');
  });

  it('sale si lo pagado en el mes, con este pago, llega al umbral', () => {
    expect(avisosDeBancarizacion(entrada({ pagadoEnElMesCentavos: 2000000 }))).toHaveLength(1);
    expect(avisosDeBancarizacion(entrada({ pagadoEnElMesCentavos: 1999999 }))).toEqual([]);
  });

  it('no sale si la empresa no pierde nada según su régimen', () => {
    const sinEfecto = entrada({ pagadoEnElMesCentavos: UMBRAL, efectoDelPago: { iva: false, isr: false } });

    expect(avisosDeBancarizacion(sinEfecto)).toEqual([]);
  });

  it('sin datos fiscales solo pide completarlos', () => {
    expect(avisosDeBancarizacion(entrada({ pagadoEnElMesCentavos: UMBRAL, efectoDelPago: null }))).toEqual([
      AVISO_DE_DATOS_FISCALES,
    ]);
  });

  it('avisa que el efectivo del mes deja de respaldar costo y crédito fiscal cuando este pago hace llegar el mes', () => {
    const avisos = avisosDeBancarizacion(
      entrada({
        pagadoEnElMesCentavos: 2500000,
        efectivoDelMes: [
          { numero: '7', efecto: { iva: true, isr: false } },
          { numero: '9', efecto: { iva: false, isr: true } },
          { numero: '10', efecto: { iva: false, isr: false } },
        ],
      }),
    );

    expect(avisos).toHaveLength(2);
    expect(avisos[1]).toContain('11/2026');
    expect(avisos[1]).toContain('recibos 7, 9)');
    expect(avisos[1]).toContain('el costo y el crédito fiscal');
  });

  it('no repite el aviso del efectivo si el mes ya había llegado al umbral antes de este pago', () => {
    const avisos = avisosDeBancarizacion(
      entrada({
        pagadoEnElMesCentavos: UMBRAL,
        efectivoDelMes: [{ numero: '7', efecto: { iva: true, isr: true } }],
      }),
    );

    expect(avisos).toHaveLength(1);
  });
});
