import { describe, expect, it } from 'vitest';
import type { Movimiento } from '../../servicios/movimientos.api';
import type { DatosSaldoInicial } from '../../servicios/saldos-iniciales.api';
import { datosDeSaldoInicial, edicionDe } from './edicion-de-saldo-inicial';

const CUENTA = '00000000-0000-4000-8000-000000000001';

const datos: DatosSaldoInicial = {
  cuentaBancariaId: CUENTA,
  tipo: 'credito',
  fecha: '2026-01-01',
  monto: '1000.00',
  referencia: 'Saldo inicial de prueba',
  observaciones: null,
};
const saldoInicial: Movimiento = {
  id: 'saldo-1',
  ...datos,
  beneficiario: null,
  saldoInicial: true,
  cuentaBancariaNombre: null,
  anuladoEn: null,
  motivoDeAnulacion: null,
  transferenciaId: null,
  chequeId: null,
  numeroDeCheque: null,
  numero: null,
  anioDeNumero: 0,
  conciliacionId: null,
  revertidoEn: null,
  motivoDeReversion: null,
  revierteAId: null,
  puedeAnular: true,
  puedeEliminar: true,
};

describe('ventana del saldo inicial', () => {
  it('lo que se abre para corregir se manda igual si no se cambia nada', () => {
    expect(datosDeSaldoInicial(edicionDe(CUENTA, saldoInicial))).toEqual(datos);
    expect(edicionDe(CUENTA, saldoInicial).id).toBe(saldoInicial.id);
  });

  it('uno nuevo empieza sin id, con crédito por omisión, fijo a la cuenta', () => {
    expect(edicionDe(CUENTA)).toMatchObject({ abierta: true, id: null, cuentaBancariaId: CUENTA, tipo: 'credito' });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeSaldoInicial(edicionDe(CUENTA))).toMatchObject({ referencia: null, observaciones: null });
  });
});
