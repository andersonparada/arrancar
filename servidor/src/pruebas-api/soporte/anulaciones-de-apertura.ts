import { expect } from 'vitest';
import '../../modulos/core/contratos/bancos.contratos.js';
import { busEventos } from '../../modulos/core/eventos/bus-eventos.js';
import type { DatosDePartidaDeAperturaAnulada } from '../../modulos/core/contratos/bancos.contratos.js';
import { RUTA_DE_APERTURA } from './apertura-por-api.js';
import type { ClienteApi } from './cliente-api.js';
import { comoPropietario } from './consultas-de-propietario.js';

/** Los eventos `bancos.partida_de_apertura_anulada` que llegan al bus mientras corren las pruebas. */
export function escucharAnulacionesDeApertura(): DatosDePartidaDeAperturaAnulada[] {
  const recibidos: DatosDePartidaDeAperturaAnulada[] = [];
  busEventos.suscribir('bancos.partida_de_apertura_anulada', (datos) => {
    recibidos.push(datos);
  });
  return recibidos;
}

/** El cheque de la partida (su id) en `bancos.cheques`. */
export async function chequeDeLaPartida(movimientoId: string): Promise<string> {
  const [fila] = await comoPropietario<{ id: string }>('select id from bancos.cheques where movimiento_id = $1', [
    movimientoId,
  ]);
  return fila!.id;
}

/** Anula una partida desde la ventana de saldos iniciales. */
export const anularPartida = (
  usuario: ClienteApi,
  { cuentaId, movimientoId }: { cuentaId: string; movimientoId: string },
  cuerpo: Record<string, unknown> = {},
) =>
  usuario.post(`${RUTA_DE_APERTURA}/${cuentaId}/partidas/${movimientoId}/anular`, {
    motivo: 'No se cobró',
    fecha: '2026-02-10',
    ...cuerpo,
  });

/** El movimiento tal como lo ve la lista de notas y movimientos (con su inverso, si lo tiene). */
export async function movimientoDeApertura(movimientoId: string) {
  const [fila] = await comoPropietario<{
    anulado_en: string | null;
    revertido_en: string | null;
    concepto: string;
    beneficiario: string | null;
    fecha: string;
    tipo: string;
    monto: string;
  }>(
    `select m.anulado_en, m.revertido_en, c.clave_de_sistema as concepto, m.beneficiario, m.fecha::text, m.tipo, m.monto::text
       from bancos.movimientos m join bancos.conceptos c on c.id = m.concepto_id where m.id = $1`,
    [movimientoId],
  );
  return fila!;
}

/** El inverso de un movimiento: su fecha, su concepto de sistema, su beneficiario y su monto. */
export async function inversoDeApertura(movimientoId: string) {
  const filas = await comoPropietario<{
    id: string;
    concepto: string;
    beneficiario: string | null;
    fecha: string;
    tipo: string;
  }>(
    `select m.id, c.clave_de_sistema as concepto, m.beneficiario, m.fecha::text, m.tipo
       from bancos.movimientos m join bancos.conceptos c on c.id = m.concepto_id where m.revierte_a_id = $1`,
    [movimientoId],
  );
  expect(filas).toHaveLength(1);
  return filas[0]!;
}
