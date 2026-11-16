import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import type { EscenarioDePagos } from './cuentas-por-pagar-pagar.js';
import { consultar, HOY } from './escenario-de-documentos.js';

export const RUTA_DE_RETIROS = '/api/cuentas-por-pagar/retiros';

/** El cuerpo de un retiro con cheque de la chequera de la cuenta, a nombre del custodio escrito. */
export const retiroConCheque = (e: EscenarioDePagos, monto: string, cambios: Record<string, unknown> = {}) => ({
  forma: 'cheque',
  chequeraId: e.chequeraId,
  monto,
  custodio: 'Juan Pérez',
  ...cambios,
});

/** El cuerpo de un retiro con nota de débito contra la cuenta (boleta de ventanilla). */
export const retiroConNota = (e: EscenarioDePagos, monto: string, cambios: Record<string, unknown> = {}) => ({
  forma: 'nota_de_debito',
  cuentaBancariaId: e.cuentaBancariaId,
  monto,
  custodio: 'Juan Pérez',
  referencia: 'BOL-123',
  ...cambios,
});

/** Registra un retiro y comprueba que salió bien; devuelve el `RetiroDto`. */
export async function registrarRetiro(cliente: ClienteApi, cuerpo: Record<string, unknown>) {
  const respuesta = await cliente.post(RUTA_DE_RETIROS, cuerpo);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo;
}

/** El retiro como quedó en la base: estado, fechas contables y lo devuelto y faltante. */
export async function retiroEnBase(retiroId: string) {
  const [fila] = await consultar<{
    estado: string;
    fecha: string;
    fecha_de_anulacion: string | null;
    fecha_de_liquidacion: string | null;
    devuelto: string;
    faltante: string;
    movimiento_de_devolucion_id: string | null;
    custodio: string;
    custodio_usuario_id: string | null;
  }>(
    `select estado, fecha::text, fecha_de_anulacion::text, fecha_de_liquidacion::text, devuelto::text, faltante::text,
            movimiento_de_devolucion_id, custodio, custodio_usuario_id
       from cuentas_por_pagar.retiros_de_efectivo where id = $1`,
    [retiroId],
  );
  return fila!;
}

export async function cuantosRetiros(): Promise<number> {
  const [fila] = await consultar<{ total: string }>(
    'select count(*)::text as total from cuentas_por_pagar.retiros_de_efectivo',
  );
  return Number(fila!.total);
}

/** El cheque o la nota de Bancos de un retiro, tal como quedó en la base. */
export async function movimientoDelRetiro(movimientoId: string) {
  const [fila] = await consultar<{
    tipo: string;
    beneficiario: string | null;
    referencia: string | null;
    motivo_de_anulacion: string | null;
    modulo: string | null;
    origen: string | null;
    no_negociable: boolean | null;
    fecha: string;
    inverso_fecha: string | null;
  }>(
    `select m.tipo, m.beneficiario, m.referencia, m.motivo_de_anulacion, m.modulo_de_origen as modulo,
            m.documento_de_origen_id as origen, c.no_negociable, m.fecha::text,
            (select i.fecha::text from bancos.movimientos i where i.revierte_a_id = m.id) as inverso_fecha
       from bancos.movimientos m left join bancos.cheques c on c.movimiento_id = m.id where m.id = $1`,
    [movimientoId],
  );
  return fila!;
}

/** El cheque de Bancos de un retiro, para anularlo desde Bancos. */
export async function chequeDelRetiro(retiroId: string): Promise<string> {
  const [fila] = await consultar<{ id: string }>(
    `select c.id from bancos.cheques c join cuentas_por_pagar.retiros_de_efectivo r on r.movimiento_id = c.movimiento_id
      where r.id = $1`,
    [retiroId],
  );
  return fila!.id;
}

/** Pasa el retiro y su cheque o nota a otra fecha (la prueba la necesita en un mes ya conciliado); no pasa por los casos de uso. */
export async function moverFechaDelRetiro(retiroId: string, fecha: string): Promise<void> {
  await consultar(
    'update bancos.movimientos set fecha = $2 where id = (select movimiento_id from cuentas_por_pagar.retiros_de_efectivo where id = $1)',
    [retiroId, fecha],
  );
  await consultar('update cuentas_por_pagar.retiros_de_efectivo set fecha = $2 where id = $1', [retiroId, fecha]);
}

/**
 * Un pago en efectivo vigente del retiro (los casos de uso del efectivo llegan en CP4-E3), sembrado en la base con una
 * línea sobre el cargo; el pago es del proveedor del cargo y de su contraseña vigente.
 */
export async function sembrarPagoDelRetiro(
  retiroId: string,
  cargoId: string,
  { monto, fecha = HOY }: { monto: string; fecha?: string },
): Promise<string> {
  const [datos] = await consultar<{ empresa_id: string; proveedor_id: string; contrasena_id: string }>(
    `select d.empresa_id, d.proveedor_id, cd.contrasena_id
       from cuentas_por_pagar.documentos d
       join cuentas_por_pagar.contrasena_documentos cd on cd.documento_id = d.id and cd.vigente
      where d.id = $1`,
    [cargoId],
  );
  const [pago] = await consultar<{ id: string }>(
    `insert into cuentas_por_pagar.pagos (empresa_id, proveedor_id, numero, forma, fecha, monto, retiro_id)
     values ($1, $2, (select coalesce(max(numero), 0) + 1 from cuentas_por_pagar.pagos where empresa_id = $1),
             'efectivo', $3, $4, $5) returning id`,
    [datos!.empresa_id, datos!.proveedor_id, fecha, monto, retiroId],
  );
  await consultar(
    `insert into cuentas_por_pagar.aplicaciones_de_pagos (empresa_id, proveedor_id, pago_id, contrasena_id, cargo_id, monto)
     values ($1, $2, $3, $4, $5, $6)`,
    [datos!.empresa_id, datos!.proveedor_id, pago!.id, datos!.contrasena_id, cargoId, monto],
  );
  return pago!.id;
}

/** La clave del concepto de sistema que Bancos fijó al movimiento (con un solo concepto no hay desglose aparte). */
export async function conceptoDelMovimiento(movimientoId: string): Promise<string | null> {
  const [fila] = await consultar<{ clave: string | null }>(
    `select c.clave_de_sistema as clave from bancos.movimientos m join bancos.conceptos c on c.id = m.concepto_id
      where m.id = $1`,
    [movimientoId],
  );
  return fila!.clave;
}
