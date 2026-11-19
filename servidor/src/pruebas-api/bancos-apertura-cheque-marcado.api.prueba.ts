/**
 * BS-8 (QA, BS8-3): un cheque de la carga inicial ya marcado en una conciliación no se anula (ni se ofrece el botón):
 * primero se desmarca; el mensaje habla de anular y no de eliminar.
 */
import { describe, expect, it } from 'vitest';
import { chequeDeLaPartida } from './soporte/anulaciones-de-apertura.js';
import { agregarPartida, empresaConInicio, guardarSaldo, partida } from './soporte/apertura-por-api.js';
import { iniciarMes, marcar } from './soporte/conciliaciones-de-apertura.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();

describe('anular un cheque de la carga inicial marcado en una conciliación', () => {
  it('lo rechaza con un mensaje de anular, y la lista de cheques no ofrece anularlo', async () => {
    const { propietario } = await empresaConInicio(entorno, {
      nombre: 'Cheque marcado',
      usuario: 'chequemarcadoapert',
    });
    const cuentaId = await crearCuentaSinSaldo(propietario);
    expect((await guardarSaldo(propietario, cuentaId, '1000.00')).estado).toBe(200);
    const cargado = await agregarPartida(
      propietario,
      cuentaId,
      partida('cheque_en_circulacion', { numeroDeCheque: 61 }),
    );
    const movimientoId = cargado.cuerpo.partida.movimientoId as string;
    const chequeId = await chequeDeLaPartida(movimientoId);

    const puedeAnular = async () => {
      const lista = await propietario.get(`/api/bancos/cheques?cuentaBancariaId=${cuentaId}`);
      return (lista.cuerpo as { id: string; puedeAnular: boolean }[]).find((c) => c.id === chequeId)?.puedeAnular;
    };
    expect(await puedeAnular()).toBe(true);

    const documento = await iniciarMes(propietario, cuentaId, 1);
    await marcar(propietario, documento.id, [movimientoId]);

    expect(await puedeAnular()).toBe(false);
    const anulado = await propietario.post(`/api/bancos/cheques/${chequeId}/anular`, { motivo: 'No se cobró' });
    expect(anulado.estado).toBe(422);
    expect(anulado.cuerpo.error.codigo).toBe('movimiento_marcado_en_conciliacion');
    expect(anulado.cuerpo.error.mensaje).toContain('no se puede anular');
  });
});
