/**
 * BS-R: el cheque cobrado antes de su fecha a más de un mes, su anulación después de autorizado y el punto de partida
 * de una carga con el saldo del banco en cero cuyo corte cae a mitad de mes.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { agregarPartida, empresaConInicio, guardarSaldo, partida } from './soporte/apertura-por-api.js';
import { idsDe, iniciarMes, marcar, terminarYAutorizar } from './soporte/conciliaciones-de-apertura.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, type CuentaDePrueba } from './soporte/escenarios.js';
import type { ClienteApi } from './soporte/cliente-api.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let autoriza: ClienteApi;

/** Una cuenta con 1,000.00 del banco y un cheque posfechado de 100.00 con esa fecha. */
async function cuentaConPosfechadoDel(fecha: string): Promise<string> {
  const cuentaId = await crearCuentaSinSaldo(cuenta.propietario);
  await guardarSaldo(cuenta.propietario, cuentaId, '1000.00');
  const concepto = await conceptoGeneral(cuenta.propietario);
  const cargado = await agregarPartida(
    cuenta.propietario,
    cuentaId,
    partida('cheque_posfechado', { conceptoId: concepto, fecha }),
  );
  expect(cargado.estado).toBe(201);
  return cuentaId;
}

/** Marca el posfechado en enero y autoriza enero. */
async function enero(cuentaId: string) {
  const documento = await iniciarMes(cuenta.propietario, cuentaId, 1);
  await marcar(cuenta.propietario, documento.id, idsDe(documento.posfechadosCandidatos));
  await terminarYAutorizar(cuenta.propietario, autoriza, documento.id);
  return documento;
}

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Posfechados largos', usuario: 'propietariolargos' });
  autoriza = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Largos',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
});

describe('cheque cobrado en enero con fecha de marzo', () => {
  it('febrero sigue restándolo como cobrado antes de su fecha y se puede terminar; en marzo entra a libros', async () => {
    const cuentaId = await cuentaConPosfechadoDel('2026-03-10');
    await enero(cuentaId);
    const febrero = await iniciarMes(cuenta.propietario, cuentaId, 2);
    expect(febrero.cuadratica.banco.saldoInicial).toBe('900.00');
    expect(febrero.cuadratica.libros).toMatchObject({ saldoInicial: '1000.00', saldoFinal: '1000.00' });
    expect(febrero.partidas.cobradosAntesDeSuFecha).toEqual([expect.objectContaining({ monto: '100.00' })]);
    expect(febrero.saldoQueDebeMostrarElEstadoDeCuenta).toBe('900.00');
    expect(febrero.posfechadosCandidatos).toHaveLength(0);
    await terminarYAutorizar(cuenta.propietario, autoriza, febrero.id);

    const marzo = await iniciarMes(cuenta.propietario, cuentaId, 3);
    expect(marzo.partidas.cobradosAntesDeSuFecha).toEqual([]);
    expect(marzo.partidas.chequesEnCirculacion).toEqual([]);
    expect(marzo.cuadratica.libros).toMatchObject({ saldoInicial: '1000.00', saldoFinal: '900.00' });
    expect(marzo.saldoQueDebeMostrarElEstadoDeCuenta).toBe('900.00');
  });
});

describe('anular un cheque que el banco ya pagó', () => {
  it('lleva nota inversa: la conciliación autorizada no cambia', async () => {
    const cuentaId = await cuentaConPosfechadoDel('2026-02-10');
    const documento = await enero(cuentaId);
    const [cheque] = await comoPropietario<{ id: string; movimiento_id: string }>(
      'select c.id, c.movimiento_id from bancos.cheques c join bancos.movimientos m on m.id = c.movimiento_id where m.cuenta_bancaria_id = $1',
      [cuentaId],
    );
    const anulado = await cuenta.propietario.post(`/api/bancos/cheques/${cheque!.id}/anular`, { motivo: 'Prueba' });
    expect(anulado.estado).toBe(200);
    const filas = await comoPropietario<{ anulado: boolean }>(
      'select anulado_en is not null as anulado from bancos.movimientos where id = $1',
      [cheque!.movimiento_id],
    );
    expect(filas[0]!.anulado).toBe(false);
    const releida = (await cuenta.propietario.get(`/api/bancos/conciliaciones/${documento.id}`)).cuerpo;
    expect(releida.partidas.cobradosAntesDeSuFecha).toEqual([expect.objectContaining({ monto: '100.00' })]);
    expect(releida.cuadratica.banco.saldoFinal).toBe('900.00');
  });
});

describe('carga con el saldo del banco en cero y corte a mitad de mes', () => {
  it('la primera conciliación parte del corte y deja fuera lo anterior', async () => {
    const mitad = await empresaConInicio(entorno, {
      nombre: 'Corte a mitad',
      usuario: 'propietariocortemitad',
      fechaDeInicio: '2026-01-16',
    });
    const cuentaId = await crearCuentaSinSaldo(mitad.propietario);
    expect((await guardarSaldo(mitad.propietario, cuentaId, '0.00')).estado).toBe(200);
    const deposito = partida('deposito_en_transito', { monto: '50.00', fecha: '2026-01-10' });
    expect((await agregarPartida(mitad.propietario, cuentaId, deposito)).estado).toBe(201);
    const documento = await iniciarMes(mitad.propietario, cuentaId, 1);
    expect(documento.saldoInicialDelBancoDeLaApertura).toEqual({ fecha: '2026-01-15', monto: '0.00' });
    expect(documento.cuadratica.libros).toMatchObject({ saldoInicial: '50.00', ingresos: '0.00' });
  });
});
