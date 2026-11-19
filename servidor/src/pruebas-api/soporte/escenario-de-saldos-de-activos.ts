import { expect } from 'vitest';
import type { CuentaDePrueba } from './escenarios.js';

export const SALDOS = '/api/activos-fijos/saldos-iniciales';

/** El saldo de un camión comprado en 2024 que aún se deprecia: costo 120,000, 50,000 depreciados y 36 meses por delante. */
export const datosDeSaldo = (claseId: string, cambios: Record<string, unknown> = {}) => ({
  descripcion: 'Camión de reparto',
  claseId,
  fechaDeAdquisicion: '2024-01-15',
  fechaDeInicioDeUso: '2024-02-01',
  cantidad: 1,
  costo: '120000.00',
  depreciacionAcumuladaContable: '50000.00',
  depreciacionAcumuladaFiscal: '72000.00',
  vidaUtilRestanteMeses: 36,
  valorResidual: '0.00',
  ...cambios,
});

/** Fija la fecha de inicio (carga inicial) de la empresa de la cuenta. */
export async function fijarFechaDeInicio(cuenta: CuentaDePrueba, fechaDeInicio: string) {
  return cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}/carga-inicial`, { fechaDeInicio });
}

export const rutaDeCarga = (cuenta: CuentaDePrueba, parte: string) =>
  `/api/empresas/${cuenta.empresaId}/carga-inicial/${parte}`;

/** Carga un saldo y exige que se cree (201); devuelve el cuerpo. */
export async function cargarSaldo(cuenta: CuentaDePrueba, claseId: string, cambios: Record<string, unknown> = {}) {
  const creado = await cuenta.propietario.post(SALDOS, datosDeSaldo(claseId, cambios));
  expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
  return creado.cuerpo;
}
