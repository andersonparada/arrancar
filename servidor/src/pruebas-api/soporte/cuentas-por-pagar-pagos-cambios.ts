import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import { RUTA_DE_PAGOS } from './cuentas-por-pagar-pagar.js';
import { consultar, HOY } from './escenario-de-documentos.js';
import { conceptoGeneral, terminarConciliacionConSaldo } from './escenarios-de-bancos.js';
import { cuentaConChequera } from './ordenes-de-bancos.js';

export const MES_CONCILIADO = '2026-01-20';

/** El pago como quedó en la base: estado y fecha contable de la anulación. */
export async function pagoEnBase(pagoId: string) {
  const [fila] = await consultar<{
    estado: string;
    fecha: string;
    fecha_de_anulacion: string | null;
    vigentes: string;
  }>(
    `select p.estado, p.fecha::text, p.fecha_de_anulacion::text,
            (select count(*) from cuentas_por_pagar.aplicaciones_de_pagos a where a.pago_id = p.id and a.vigente)::text as vigentes
       from cuentas_por_pagar.pagos p where p.id = $1`,
    [pagoId],
  );
  return fila!;
}

/** La fecha del cheque y del pago pasa a otra (la prueba la necesita en un mes ya conciliado); no pasa por los casos de uso. */
export async function moverFechaDelPago(pagoId: string, fecha: string): Promise<void> {
  await consultar(
    'update bancos.movimientos set fecha = $2 where id = (select movimiento_id from cuentas_por_pagar.pagos where id = $1)',
    [pagoId, fecha],
  );
  await consultar('update cuentas_por_pagar.pagos set fecha = $2 where id = $1', [pagoId, fecha]);
}

/** El cheque de Bancos que emitió un pago. */
export async function chequeDelPago(pagoId: string): Promise<string> {
  const [fila] = await consultar<{ id: string }>(
    `select c.id from bancos.cheques c join cuentas_por_pagar.pagos p on p.movimiento_id = c.movimiento_id where p.id = $1`,
    [pagoId],
  );
  return fila!.id;
}

/** El inverso de un movimiento de Bancos (nota que lo revierte), con su fecha. */
export async function inversoDe(movimientoId: string): Promise<{ id: string; fecha: string } | undefined> {
  const [fila] = await consultar<{ id: string; fecha: string }>(
    'select id, fecha::text from bancos.movimientos where revierte_a_id = $1',
    [movimientoId],
  );
  return fila;
}

/** Inicia la conciliación de enero de 2026 de la cuenta y marca los movimientos dados (el banco ya los vio). */
export async function iniciarEnero(usuario: ClienteApi, cuentaBancariaId: string, marcados: string[] = []) {
  const iniciada = await usuario.post('/api/bancos/conciliaciones', { cuentaBancariaId, anio: 2026, mes: 1 });
  expect(iniciada.estado, JSON.stringify(iniciada.cuerpo)).toBe(201);
  const ruta = `/api/bancos/conciliaciones/${iniciada.cuerpo.id}`;
  const saldoInicial = (iniciada.cuerpo.candidatos as Array<{ id: string; saldoInicial: boolean }>).find(
    (m) => m.saldoInicial,
  );
  const marcas = [...marcados, ...(marcados.length > 0 && saldoInicial ? [saldoInicial.id] : [])];
  if (marcas.length > 0) {
    const respuesta = await usuario.put(`${ruta}/marcas`, { movimientoIds: marcas });
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  }
  return { id: iniciada.cuerpo.id as string, ruta };
}

/** Termina y autoriza la conciliación: el mes queda conciliado y bloqueado. */
export async function cerrarEnero(
  propietario: ClienteApi,
  autoriza: ClienteApi,
  conciliacion: { id: string; ruta: string },
) {
  const terminada = await terminarConciliacionConSaldo(propietario, conciliacion.id);
  expect(terminada.estado, JSON.stringify(terminada.cuerpo)).toBe(200);
  expect((await autoriza.post(`${conciliacion.ruta}/autorizar`, {})).estado).toBe(200);
}

export const anularPago = (
  cliente: ClienteApi,
  pagoId: string,
  cuerpo: Record<string, unknown> = { motivo: 'Error' },
) => cliente.post(`${RUTA_DE_PAGOS}/${pagoId}/anular`, cuerpo);

export const reaplicarPago = (cliente: ClienteApi, pagoId: string, cuerpo: Record<string, unknown>) =>
  cliente.post(`${RUTA_DE_PAGOS}/${pagoId}/reaplicar`, cuerpo);

export const saldarDiferencia = (cliente: ClienteApi, pagoId: string, cuerpo: Record<string, unknown>) =>
  cliente.post(`${RUTA_DE_PAGOS}/${pagoId}/diferencias`, cuerpo);

/** Otra cuenta bancaria con su chequera y Q 20,000.00 de fondos, para pagar sin mezclar con las conciliaciones de otras pruebas. */
export async function cuentaConFondos(usuario: ClienteApi, nombre: string) {
  const cuenta = await cuentaConChequera(usuario, nombre);
  const deposito = await usuario.post('/api/bancos/notas', {
    cuentaBancariaId: cuenta.cuentaBancariaId,
    tipo: 'credito',
    fecha: HOY,
    monto: '20000.00',
    referencia: 'Fondos de la prueba',
    beneficiario: null,
    observaciones: null,
    conceptoId: await conceptoGeneral(usuario),
  });
  expect(deposito.estado, JSON.stringify(deposito.cuerpo)).toBe(201);
  return cuenta;
}
