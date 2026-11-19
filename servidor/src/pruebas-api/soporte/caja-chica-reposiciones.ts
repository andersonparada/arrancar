import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import { RUTA_DE_CAJA_CHICA, type EscenarioDeComprobantes } from './caja-chica-comprobantes.js';
import { RUTA_DE_FONDOS } from './caja-chica-fondos.js';
import { comoPropietario } from './consultas-de-propietario.js';

/** Los usuarios que usan las pruebas de reposiciones, con los permisos que cada uno trae. */
export const PERMISOS_PARA_REPONER = ['caja-chica.fondos.ver', 'caja-chica.reposiciones.crear'];

/** Reponer con un cheque de la chequera del escenario; `cambios` ajusta el cuerpo. */
export const cuerpoDeReposicion = (
  e: EscenarioDeComprobantes,
  ids: string[],
  cambios: Record<string, unknown> = {},
) => ({
  comprobanteIds: ids,
  forma: 'cheque',
  chequeraId: e.caja.chequeraId,
  ...cambios,
});

export const reponer = (
  e: EscenarioDeComprobantes,
  por: { fondoId: string; ids: string[]; cambios?: Record<string, unknown>; cliente?: ClienteApi },
) =>
  (por.cliente ?? e.propietario()).post(
    `${RUTA_DE_FONDOS}/${por.fondoId}/reposiciones`,
    cuerpoDeReposicion(e, por.ids, por.cambios),
  );

/** Repone y comprueba que salió bien; devuelve la reposición. */
export async function reponerBien(
  e: EscenarioDeComprobantes,
  por: { fondoId: string; ids: string[]; cambios?: Record<string, unknown>; cliente?: ClienteApi },
) {
  const respuesta = await reponer(e, por);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo;
}

export const anularReposicion = (
  reposicionId: string,
  cliente: ClienteApi,
  cuerpo: Record<string, unknown> = { motivo: 'Se repuso de más' },
) => cliente.post(`${RUTA_DE_CAJA_CHICA}/reposiciones/${reposicionId}/anular`, cuerpo);

/** La fila de la reposición en la base. */
export async function reposicionEnBase(reposicionId: string) {
  const [fila] = await comoPropietario<{
    numero: number;
    estado: string;
    forma: string;
    monto: string;
    fecha: string;
    movimiento_id: string | null;
    custodio: string;
    la_hizo_el_custodio: boolean;
    fecha_de_anulacion: string | null;
    motivo_de_anulacion: string | null;
  }>(
    `select numero, estado, forma, monto::text, fecha::text, movimiento_id, custodio, la_hizo_el_custodio,
            fecha_de_anulacion::text, motivo_de_anulacion
       from caja_chica.reposiciones where id = $1`,
    [reposicionId],
  );
  return fila!;
}

/** Las líneas de la reposición: cuántas siguen vigentes. */
export const lineasVigentesDe = async (reposicionId: string): Promise<number> =>
  (
    await comoPropietario(`select 1 from caja_chica.reposicion_comprobantes where reposicion_id = $1 and vigente`, [
      reposicionId,
    ])
  ).length;

/**
 * Los conceptos de Bancos del cheque o la nota, con su monto: con varios, el reparto que guarda `desglose_de_movimientos`;
 * con uno solo, el concepto del propio movimiento.
 */
export async function conceptosEnBancos(movimientoId: string) {
  const reparto = await comoPropietario<{ clave: string; monto: string }>(
    `select c.clave_de_sistema as clave, d.monto::text as monto
       from bancos.desglose_de_movimientos d join bancos.conceptos c on c.id = d.concepto_id
      where d.movimiento_id = $1 order by c.clave_de_sistema`,
    [movimientoId],
  );
  if (reparto.length > 0) return reparto;
  return comoPropietario<{ clave: string; monto: string }>(
    `select c.clave_de_sistema as clave, m.monto::text as monto
       from bancos.movimientos m join bancos.conceptos c on c.id = m.concepto_id where m.id = $1`,
    [movimientoId],
  );
}

/** El documento del libro ya está marcado como procesado por su destino. */
export async function documentoProcesado(documentoId: string): Promise<boolean> {
  const [fila] = await comoPropietario<{ procesado: boolean }>(
    'select procesado_en_destino_en is not null as procesado from libro_de_compras.documentos where id = $1',
    [documentoId],
  );
  return fila!.procesado;
}

/** Las entradas de auditoría de una reposición, la más antigua primero. */
export const auditoriaDeLaReposicion = (reposicionId: string) =>
  comoPropietario<{ accion: string; motivo: string | null; anterior: any }>(
    `select accion, motivo, anterior from core.auditoria
      where recurso = 'caja-chica.reposiciones' and registro_id = $1 order by creado_en, id`,
    [reposicionId],
  );

let anioDeConciliacion = 2000;

/** El banco ya pagó el movimiento: lo pone en una conciliación (una por cuenta y mes: cada llamada usa un año nuevo). */
export async function conciliarElMovimiento(movimientoId: string): Promise<void> {
  anioDeConciliacion += 1;
  const [conciliacion] = await comoPropietario<{ id: string }>(
    `insert into bancos.conciliaciones (empresa_id, cuenta_bancaria_id, anio, mes, estado, previa_al_saldo_transcrito)
     select empresa_id, cuenta_bancaria_id, $2::int, 3, 'autorizada', true from bancos.movimientos where id = $1
     returning id`,
    [movimientoId, anioDeConciliacion],
  );
  await comoPropietario('update bancos.movimientos set conciliacion_id = $2 where id = $1', [
    movimientoId,
    conciliacion!.id,
  ]);
}
