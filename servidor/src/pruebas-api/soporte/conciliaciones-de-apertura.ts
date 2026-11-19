import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import { guardarSaldo, agregarPartida, partida } from './apertura-por-api.js';
import { crearCuentaSinSaldo } from './escenarios-de-apertura.js';
import { terminarConciliacionConSaldo } from './escenarios-de-bancos.js';

/** Un candidato del documento de conciliación, con lo que las pruebas miran. */
export interface Candidato {
  id: string;
  tipo: string;
  fecha: string;
  parteDeApertura: string | null;
  marcado: boolean;
}

export const RUTA = '/api/bancos/conciliaciones';

/** Inicia la conciliación de un mes de 2026 y devuelve su documento. */
export async function iniciarMes(usuario: ClienteApi, cuentaBancariaId: string, mes: number) {
  const iniciada = await usuario.post(RUTA, { cuentaBancariaId, anio: 2026, mes });
  expect(iniciada.estado).toBe(201);
  return iniciada.cuerpo;
}

/** Marca esos movimientos (y solo esos) y devuelve el documento. */
export async function marcar(usuario: ClienteApi, conciliacionId: string, movimientoIds: string[]) {
  const respuesta = await usuario.put(`${RUTA}/${conciliacionId}/marcas`, { movimientoIds });
  expect(respuesta.estado).toBe(200);
  return respuesta.cuerpo;
}

/** Termina (con el saldo calculado) y la autoriza otra persona. */
export async function terminarYAutorizar(elabora: ClienteApi, autoriza: ClienteApi, conciliacionId: string) {
  expect((await terminarConciliacionConSaldo(elabora, conciliacionId)).estado).toBe(200);
  const autorizada = await autoriza.post(`${RUTA}/${conciliacionId}/autorizar`, {});
  expect(autorizada.estado).toBe(200);
  return autorizada.cuerpo;
}

/** Los ids de los candidatos que cumplen la condición. */
export const idsDe = (candidatos: Candidato[], condicion: (c: Candidato) => boolean = () => true) =>
  candidatos.filter(condicion).map((c) => c.id);

/**
 * Una cuenta cargada con el saldo del banco de 1,000.00, un cheque en circulación de 100.00, un depósito en tránsito
 * de 50.00 y un error del banco de 30.00 a favor (libros al corte: 980.00).
 */
export async function cuentaConPartidas(usuario: ClienteApi): Promise<string> {
  const cuentaId = await crearCuentaSinSaldo(usuario);
  expect((await guardarSaldo(usuario, cuentaId, '1000.00')).estado).toBe(200);
  const partidas = [
    partida('cheque_en_circulacion', { numeroDeCheque: 7, monto: '100.00' }),
    partida('deposito_en_transito', { monto: '50.00', fecha: '2025-12-28' }),
    partida('error_del_banco', { monto: '30.00', sentido: 'credito' }),
  ];
  for (const cuerpo of partidas) expect((await agregarPartida(usuario, cuentaId, cuerpo)).estado).toBe(201);
  return cuentaId;
}
