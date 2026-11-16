import { DocumentosPorPagarDePrueba } from './cuentas-por-pagar.js';
import { consultar, type EscenarioDeDocumentos } from './escenario-de-documentos.js';

/** Cuándo se «registraron» los documentos sembrados, salvo que la prueba diga otra cosa: antes de cualquier corte de las pruebas. */
export const REGISTRADO_EL = '2026-02-01';

export interface CargoSembrado {
  proveedorId: string;
  numero: string;
  /** `AAAA-MM-DD`. */
  emision: string;
  vencimiento: string | null;
  /** El saldo al inicio (y el total, si no se dice otro). */
  monto: string;
  total?: string;
  retenciones?: string;
  porPracticar?: string;
  tipo?: 'factura' | 'nota_de_credito';
  /** Cuándo entró al sistema, `AAAA-MM-DD`. */
  registradoEl?: string;
  autorizado?: boolean;
}

/** Siembra un saldo inicial (cargo o nota de crédito) con sus fechas exactas y lo deja «registrado» desde `registradoEl`. */
export async function sembrarDocumento(escenario: EscenarioDeDocumentos, datos: CargoSembrado): Promise<string> {
  const { proveedorId, numero, emision, vencimiento, monto, tipo = 'factura' } = datos;
  const id = await new DocumentosPorPagarDePrueba(escenario, emision).sembrarSaldoInicial({
    proveedorId,
    numero,
    tipo,
    fechaEmision: emision,
    vencimiento,
    total: datos.total ?? monto,
    retenciones: datos.retenciones ?? '0',
    saldoAlInicio: monto,
    retencionesPorPracticar: datos.porPracticar ?? '0',
  });
  await consultar('update cuentas_por_pagar.documentos set creado_en = $2 where id = $1', [
    id,
    datos.registradoEl ?? REGISTRADO_EL,
  ]);
  if (datos.autorizado) await autorizarEnLaBase([id]);
  return id;
}

/** Deja los documentos autorizados (a nombre de quien los registró, como autorización propia). */
export async function autorizarEnLaBase(ids: string[]): Promise<void> {
  await consultar(
    `update cuentas_por_pagar.documentos set estado = 'autorizado', autorizado_en = now(), autorizado_por = registrado_por,
            autorizacion_propia = true where id = any($1::uuid[])`,
    [ids],
  );
}

/** Anula un documento ahora (la fecha contable de su anulación es hoy). */
export async function anularDocumentoEnLaBase(id: string): Promise<void> {
  await consultar(
    `update cuentas_por_pagar.documentos set estado = 'anulado', anulado_en = now(), anulado_por = (select id from core.usuarios limit 1),
            motivo_de_anulacion = 'Error de la prueba', estaba_autorizado = (estado = 'autorizado') where id = $1`,
    [id],
  );
}

/** Una contraseña vigente del proveedor con esos cargos; devuelve su id. */
export async function sembrarContrasenaEnLaBase(
  escenario: EscenarioDeDocumentos,
  proveedorId: string,
  cargoIds: string[],
): Promise<string> {
  const [contrasena] = await consultar<{ id: string }>(
    `insert into cuentas_por_pagar.contrasenas (empresa_id, proveedor_id, numero, fecha, fecha_de_pago)
     values ($1, $2, (select coalesce(max(numero), 0) + 1 from cuentas_por_pagar.contrasenas where empresa_id = $1),
             '2026-02-01', '2026-03-01') returning id`,
    [escenario.cuenta.empresaId, proveedorId],
  );
  await consultar(
    `insert into cuentas_por_pagar.contrasena_documentos (empresa_id, proveedor_id, contrasena_id, documento_id)
     select $1, $2, $3, unnest($4::uuid[])`,
    [escenario.cuenta.empresaId, proveedorId, contrasena!.id, cargoIds],
  );
  return contrasena!.id;
}

/** Cambia la fecha de un pago sembrado y cuándo se emitió (`AAAA-MM-DD`). */
export async function fecharPago(pagoId: string, fecha: string, emitidoEl: string): Promise<void> {
  await consultar('update cuentas_por_pagar.pagos set fecha = $2, creado_en = $3 where id = $1', [
    pagoId,
    fecha,
    emitidoEl,
  ]);
}

/** Cambia la fecha contable de un ajuste sembrado. */
export async function fecharAjuste(ajusteId: string, fecha: string): Promise<void> {
  await consultar('update cuentas_por_pagar.ajustes_de_saldo set fecha = $2 where id = $1', [ajusteId, fecha]);
}

/** Cambia la fecha de un reintegro sembrado. */
export async function fecharReintegro(reintegroId: string, fecha: string): Promise<void> {
  await consultar('update cuentas_por_pagar.reintegros set fecha = $2 where id = $1', [reintegroId, fecha]);
}

/** El día de hoy en Guatemala, como lo ve la base. */
const HOY_EN_LA_BASE = "(now() at time zone 'America/Guatemala')::date";

/** Anula un pago sembrado hoy, con la fecha contable de hoy (nunca antes de su fecha), y deja sus líneas no vigentes. */
export async function anularPagoEnLaBase(pagoId: string): Promise<void> {
  await consultar(
    `update cuentas_por_pagar.pagos set estado = 'anulado', anulado_en = now(),
            anulado_por = (select id from core.usuarios limit 1), motivo_de_anulacion = 'Error',
            fecha_de_anulacion = greatest(fecha, ${HOY_EN_LA_BASE}) where id = $1`,
    [pagoId],
  );
  await consultar('update cuentas_por_pagar.aplicaciones_de_pagos set vigente = false where pago_id = $1', [pagoId]);
}

/** Anula un reintegro sembrado hoy, con la fecha contable de hoy. */
export async function anularReintegroEnLaBase(reintegroId: string): Promise<void> {
  await consultar(
    `update cuentas_por_pagar.reintegros set estado = 'anulado', anulado_en = now(),
            anulado_por = (select id from core.usuarios limit 1), motivo_de_anulacion = 'Error',
            fecha_de_anulacion = greatest(fecha, ${HOY_EN_LA_BASE}) where id = $1`,
    [reintegroId],
  );
  await consultar('update cuentas_por_pagar.aplicaciones_de_reintegros set vigente = false where reintegro_id = $1', [
    reintegroId,
  ]);
}
