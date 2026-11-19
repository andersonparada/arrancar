import { describe, expect, it } from 'vitest';
import { MAXIMO_DE_CIFRAS_POR_MODULO } from '../../core/contratos/empresas.contratos.js';
import type { SaldoInicialResumenDto, SaldosInicialesDto } from './dto/saldo-inicial.dto.js';
import { revisionDeCierreDeBancos } from './revision-de-cierre-para-empresas.js';

const cuenta = (cambios: Partial<SaldoInicialResumenDto> = {}): SaldoInicialResumenDto => ({
  cuentaBancariaId: crypto.randomUUID(),
  cuentaNombre: 'Cuenta',
  bancoNombre: 'Banco',
  activa: true,
  forma: 'con_partidas',
  fechaDeCorte: '2025-12-31',
  saldoSegunEstadoDeCuenta: '100.00',
  totalDepositosEnTransito: '0.00',
  totalChequesEnCirculacion: '0.00',
  totalDebitosEnTransito: '0.00',
  totalErroresDelBanco: '0.00',
  saldoEnLibrosAlCorte: '100.00',
  saldoSegunLibrosAnteriores: '90.00',
  diferencia: '10.00',
  cuadra: false,
  totalPosfechados: '0.00',
  tieneEvidencia: true,
  tieneConciliaciones: false,
  puedeEditar: true,
  puedeEliminar: true,
  ...cambios,
});

const saldos = (cuentas: SaldoInicialResumenDto[]): SaldosInicialesDto => ({
  fechaDeInicio: '2026-01-01',
  fechaDeCorte: '2025-12-31',
  cargaCerrada: false,
  cuentas,
  totalBancos: '0.00',
  totalSobregiros: '0.00',
  hallazgos: [],
});

describe('revisión de Bancos para Empresas', () => {
  it('sin cuentas o con solo cuentas inactivas sin saldo no tiene nada que decir', () => {
    expect(revisionDeCierreDeBancos(saldos([]))).toBeNull();
    expect(revisionDeCierreDeBancos(saldos([cuenta({ activa: false, forma: 'sin_saldo' })]))).toBeNull();
  });

  it('una sola cuenta activa sin saldo avisa en singular', () => {
    const revision = revisionDeCierreDeBancos(saldos([cuenta({ forma: 'sin_saldo' })]));

    expect(revision?.hallazgos[0]?.mensaje).toBe('Hay 1 cuenta bancaria activa y no tiene saldo inicial.');
  });

  it('con muchas cuentas solo guarda los totales, para no pasar de 200 cifras', () => {
    const muchas = Array.from({ length: 80 }, () => cuenta());

    const revision = revisionDeCierreDeBancos(saldos(muchas));

    expect(revision?.cifras.map((c) => c.clave)).toEqual([
      'cuentas_con_saldo_inicial',
      'total_bancos',
      'total_sobregiros',
    ]);
  });

  it('con el máximo de cuentas con detalle no pasa del tope', () => {
    const revision = revisionDeCierreDeBancos(saldos(Array.from({ length: 60 }, () => cuenta())));

    expect(revision!.cifras.length).toBeLessThanOrEqual(MAXIMO_DE_CIFRAS_POR_MODULO);
  });

  it('con posfechados sin ligar agrega el aviso, sin pedir motivo, y ya no es una revisión vacía', () => {
    const revision = revisionDeCierreDeBancos(saldos([]), { cantidad: 2, totalCentavos: 35050 });

    expect(revision?.hallazgos).toEqual([
      expect.objectContaining({
        codigo: 'posfechados_sin_ligar',
        nivel: 'aviso',
        mensaje: expect.stringContaining('Hay 2 cheques posfechados de apertura sin ligar (Q 350.50)'),
      }),
    ]);
  });

  it('sin posfechados sin ligar, o sin dato de ellos, no agrega nada', () => {
    const conCuenta = saldos([cuenta()]);

    expect(revisionDeCierreDeBancos(conCuenta, { cantidad: 0, totalCentavos: 0 })?.hallazgos).toEqual([]);
    expect(revisionDeCierreDeBancos(conCuenta)?.hallazgos).toEqual([]);
    expect(revisionDeCierreDeBancos(saldos([]), { cantidad: 0, totalCentavos: 0 })).toBeNull();
  });
});
