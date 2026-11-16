import { describe, expect, it } from 'vitest';
import type { RetiroDeEfectivo } from '../../../dominio/retiros.js';
import type { PagoDelRetiro } from '../../puertos/puertos-de-retiros.js';
import { dtoDelRetiro, type RetiroPorArmar } from './armado-del-retiro.js';

const retiro = (cambios: Partial<RetiroDeEfectivo> = {}): RetiroDeEfectivo => ({
  id: 'r1',
  numero: 3,
  anioDeNumero: 0,
  forma: 'cheque',
  fecha: '2026-11-10',
  montoCentavos: 100000,
  movimientoId: 'm1',
  custodio: 'Juan',
  custodioUsuarioId: 'u1',
  observaciones: null,
  estado: 'abierto',
  fechaDeLiquidacion: null,
  liquidadoPor: null,
  devueltoCentavos: 0,
  movimientoDeDevolucionId: null,
  faltanteCentavos: 0,
  motivoDeFaltante: null,
  fechaDeAnulacion: null,
  motivoDeAnulacion: null,
  ...cambios,
});

const pago = (montoCentavos: number, estado: 'vigente' | 'anulado' = 'vigente'): PagoDelRetiro => ({
  id: `p${montoCentavos}`,
  numero: 1,
  anioDeNumero: 0,
  proveedor: { id: 'pv', nombre: 'Agro S.A.' },
  fecha: '2026-11-11',
  montoCentavos,
  estado,
});

const por = (cambios: Partial<RetiroPorArmar> = {}): RetiroPorArmar => ({
  retiro: retiro(),
  pagos: [],
  movimiento: { id: 'm1', cuentaBancariaId: 'c1', numero: 25 },
  deposito: null,
  conciliado: false,
  hoy: '2026-11-15',
  usuarioId: 'u2',
  avisos: [],
  ...cambios,
});

describe('el retiro como lo ve la pantalla', () => {
  it('un retiro abierto sin pagos se puede anular y liquidar, y todo está disponible', () => {
    expect(dtoDelRetiro(por())).toMatchObject({
      numero: '3',
      monto: '1000.00',
      pagado: '0.00',
      disponible: '1000.00',
      puedeAnular: true,
      puedeLiquidar: true,
      puedeReabrir: false,
      deMesAnterior: false,
      liquidaElCustodio: false,
    });
  });

  it('suma solo los pagos vigentes y con pagos no se puede anular', () => {
    const dto = dtoDelRetiro(por({ pagos: [pago(30000), pago(10000, 'anulado')] }));

    expect(dto).toMatchObject({ pagado: '300.00', disponible: '700.00', puedeAnular: false });
    expect(dto.pagos.map(({ estado }) => estado)).toEqual(['vigente', 'anulado']);
  });

  it('con el cheque cobrado no se puede anular pero sí liquidar', () => {
    expect(dtoDelRetiro(por({ conciliado: true }))).toMatchObject({ puedeAnular: false, puedeLiquidar: true });
  });

  it('el de un mes anterior trae su aviso y el custodio que lo lee lo sabe', () => {
    const dto = dtoDelRetiro(por({ hoy: '2026-12-02', usuarioId: 'u1', avisos: ['de Bancos'] }));

    expect(dto.deMesAnterior).toBe(true);
    expect(dto.liquidaElCustodio).toBe(true);
    expect(dto.avisos[0]).toBe('de Bancos');
    expect(dto.avisos[1]).toContain('El retiro 3 es de 11/2026 y aún tiene Q1,000.00 sin usar');
  });

  it('un retiro liquidado muestra lo devuelto, el faltante y solo se puede reabrir', () => {
    const dto = dtoDelRetiro(
      por({
        retiro: retiro({
          estado: 'liquidado',
          fechaDeLiquidacion: '2026-11-12',
          devueltoCentavos: 30000,
          faltanteCentavos: 10000,
          motivoDeFaltante: 'Se cayó',
        }),
        pagos: [pago(60000)],
        deposito: { id: 'm2', cuentaBancariaId: 'c1', numero: 8 },
      }),
    );

    expect(dto).toMatchObject({
      disponible: '0.00',
      devuelto: '300.00',
      faltante: '100.00',
      liquidacion: { fecha: '2026-11-12', deposito: { id: 'm2' } },
      puedeAnular: false,
      puedeLiquidar: false,
      puedeReabrir: true,
      deMesAnterior: false,
    });
  });

  it('un retiro anulado no deja efectivo por usar y trae su anulación', () => {
    const dto = dtoDelRetiro(
      por({ retiro: retiro({ estado: 'anulado', fechaDeAnulacion: '2026-11-12', motivoDeAnulacion: 'Error' }) }),
    );

    expect(dto).toMatchObject({
      disponible: '0.00',
      anulacion: { fecha: '2026-11-12', motivo: 'Error' },
      puedeAnular: false,
      puedeLiquidar: false,
      liquidaElCustodio: false,
    });
  });
});
