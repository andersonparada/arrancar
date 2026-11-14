import { consultar, HOY, type EscenarioDeDocumentos } from './escenario-de-documentos.js';

/** Lo que un pago sembrado entrega a un cargo de su contraseña. */
export interface LineaSembrada {
  cargoPropio: string;
  monto: string;
  retencionDescontada?: string;
}

export interface PagoSembrado {
  contrasenaId: string;
  lineas: LineaSembrada[];
  /** `AAAA-MM-DD`; con una posterior a hoy el pago queda comprometido. */
  fecha?: string;
  estado?: 'vigente' | 'anulado';
}

/**
 * Siembra un pago con sus líneas (los casos de uso que pagan llegan en CP4-3). Es siempre `cuenta_de_apertura`, la única forma sin movimiento en Bancos. Un pago `anulado` trae su anulación
 * completa y sus líneas en `vigente = false`. Devuelve el id y el número del pago.
 */
export async function sembrarPago(
  escenario: EscenarioDeDocumentos,
  { contrasenaId, lineas, fecha = HOY, estado = 'vigente' }: PagoSembrado,
): Promise<{ id: string; numero: number }> {
  const anulado = estado === 'anulado';
  const total = lineas.reduce((suma, { monto }) => suma + Number(monto), 0).toFixed(2);
  const [pago] = await consultar<{ id: string; numero: number }>(
    `insert into cuentas_por_pagar.pagos (empresa_id, proveedor_id, contrasena_id, numero, forma, fecha, monto, motivo,
       con_carga_cerrada, estado, anulado_en, anulado_por, motivo_de_anulacion)
     select empresa_id, proveedor_id, id,
            (select coalesce(max(numero), 0) + 1 from cuentas_por_pagar.pagos where empresa_id = c.empresa_id),
            'cuenta_de_apertura', $2, $3, 'Pago sembrado por la prueba', false, $4,
            case when $5 then now() end, case when $5 then (select id from core.usuarios where usuario = $6) end,
            case when $5 then 'Error' end
       from cuentas_por_pagar.contrasenas c where id = $1 returning id, numero`,
    [contrasenaId, fecha, total, estado, anulado, escenario.cuenta.usuario],
  );
  for (const { cargoPropio, monto, retencionDescontada = '0' } of lineas) {
    await consultar(
      `insert into cuentas_por_pagar.aplicaciones_de_pagos (empresa_id, proveedor_id, pago_id, contrasena_id, cargo_id,
         monto, retencion_descontada, vigente)
       select empresa_id, proveedor_id, $1, $2, id, $3, $4, $5 from cuentas_por_pagar.documentos where id = $6`,
      [pago!.id, contrasenaId, monto, retencionDescontada, !anulado, cargoPropio],
    );
  }
  return pago!;
}

/** Anula un pago sembrado: su anulación completa y sus líneas en `vigente = false`. */
export async function anularPagoSembrado(escenario: EscenarioDeDocumentos, pagoId: string): Promise<void> {
  await consultar(
    `update cuentas_por_pagar.pagos set estado = 'anulado', anulado_en = now(),
            anulado_por = (select id from core.usuarios where usuario = $2), motivo_de_anulacion = 'Error' where id = $1`,
    [pagoId, escenario.cuenta.usuario],
  );
  await consultar('update cuentas_por_pagar.aplicaciones_de_pagos set vigente = false where pago_id = $1', [pagoId]);
}

/** Siembra un reintegro del proveedor en efectivo contra la nota (el caso de uso que los crea llega en CP4-7). */
export async function sembrarReintegro(
  escenario: EscenarioDeDocumentos,
  { notaPropia, monto, estado = 'vigente' }: { notaPropia: string; monto: string; estado?: 'vigente' | 'anulado' },
): Promise<string> {
  const anulado = estado === 'anulado';
  const [reintegro] = await consultar<{ id: string }>(
    `insert into cuentas_por_pagar.reintegros (empresa_id, proveedor_id, numero, forma, fecha, monto, referencia, estado,
       anulado_en, anulado_por, motivo_de_anulacion)
     select empresa_id, proveedor_id,
            (select coalesce(max(numero), 0) + 1 from cuentas_por_pagar.reintegros where empresa_id = d.empresa_id),
            'efectivo', current_date, $2, 'RC-1', $3,
            case when $4 then now() end, case when $4 then (select id from core.usuarios where usuario = $5) end,
            case when $4 then 'Error' end
       from cuentas_por_pagar.documentos d where id = $1 returning id`,
    [notaPropia, monto, estado, anulado, escenario.cuenta.usuario],
  );
  await consultar(
    `insert into cuentas_por_pagar.aplicaciones_de_reintegros (empresa_id, proveedor_id, reintegro_id, nota_id, monto,
       vigente)
     select empresa_id, proveedor_id, $1, id, $2, $3 from cuentas_por_pagar.documentos where id = $4`,
    [reintegro!.id, monto, !anulado, notaPropia],
  );
  return reintegro!.id;
}
