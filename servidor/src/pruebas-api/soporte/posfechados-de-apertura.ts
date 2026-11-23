import { expect } from 'vitest';
import { agregarPartida, partida } from './apertura-por-api.js';
import type { ClienteApi } from './cliente-api.js';
import { comoPropietario } from './consultas-de-propietario.js';
import { conceptoGeneral } from './escenarios-de-bancos.js';

let numeroDeCheque = 100;

/** Un cheque posfechado de apertura (fecha posterior al corte) en la cuenta; devuelve el id de su movimiento. */
export async function crearPosfechadoDeApertura(
  usuario: ClienteApi,
  cuentaId: string,
  datos: { monto: string; beneficiario: string; fecha?: string },
): Promise<string> {
  numeroDeCheque += 1;
  const conceptoId = await conceptoGeneral(usuario);
  const respuesta = await agregarPartida(
    usuario,
    cuentaId,
    partida('cheque_posfechado', { ...datos, conceptoId, numeroDeCheque }),
  );
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.partida.movimientoId as string;
}

/** Marca el movimiento como ligado a un pago de otro módulo, como lo hará `ligar_cheque_de_apertura` (AP-2). */
export async function ligarPosfechadoComoPropietario(movimientoId: string): Promise<void> {
  await comoPropietario(
    `update bancos.movimientos set modulo_de_origen = 'cuentas-por-pagar', documento_de_origen_id = gen_random_uuid() where id = $1`,
    [movimientoId],
  );
}
