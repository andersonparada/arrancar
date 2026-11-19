/**
 * BS-8 (QA): bordes de la carga inicial de Bancos encontrados a mano (BS8-1: número de cheque fuera de rango).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { agregarPartida, empresaConInicio, guardarSaldo, partida } from './soporte/apertura-por-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import type { CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaId: string;

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'QA BS8 bordes', usuario: 'propietarioqabsocho' });
  cuentaId = await crearCuentaSinSaldo(cuenta.propietario);
  expect((await guardarSaldo(cuenta.propietario, cuentaId, '500.00')).estado).toBe(200);
});

describe('número de cheque de una partida de la apertura', () => {
  // Error BS8-1: un número negativo o mayor que el entero de la base revienta con 500 en vez de un 400 con mensaje.
  it.each([-3, 2147483648, 99999999999])('el número %d se rechaza con 400 y no con 500', async (numero) => {
    const respuesta = await agregarPartida(
      cuenta.propietario,
      cuentaId,
      partida('cheque_en_circulacion', { numeroDeCheque: numero }),
    );
    expect(respuesta.estado).toBe(400);
  });

  it('un número normal sí se agrega (control de la prueba anterior)', async () => {
    const respuesta = await agregarPartida(
      cuenta.propietario,
      cuentaId,
      partida('cheque_en_circulacion', { numeroDeCheque: 5001 }),
    );
    expect(respuesta.estado).toBe(201);
  });
});
