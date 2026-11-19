/**
 * BS-4: los cheques cobrados antes de su fecha (§2.6), la foto de la conciliación, el periodo propuesto y que las
 * conciliaciones de antes (saldo global) no cambian.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { agregarPartida, empresaConInicio, guardarSaldo, partida } from './soporte/apertura-por-api.js';
import {
  type Candidato,
  idsDe,
  iniciarMes,
  marcar,
  RUTA,
  terminarYAutorizar,
} from './soporte/conciliaciones-de-apertura.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import type { ClienteApi } from './soporte/cliente-api.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let autoriza: ClienteApi;

/** Una cuenta con 1,000.00 del banco y un cheque posfechado del 10 de febrero de 100.00. */
async function cuentaConPosfechado(): Promise<string> {
  const cuentaId = await crearCuentaSinSaldo(cuenta.propietario);
  await guardarSaldo(cuenta.propietario, cuentaId, '1000.00');
  const concepto = await conceptoGeneral(cuenta.propietario);
  const cargado = await agregarPartida(
    cuenta.propietario,
    cuentaId,
    partida('cheque_posfechado', { conceptoId: concepto }),
  );
  expect(cargado.estado).toBe(201);
  return cuentaId;
}

const fotoDe = async (conciliacionId: string) =>
  (
    await comoPropietario<{ total: string | null }>(
      'select foto_total_cobrados_antes_de_su_fecha::text as total from bancos.conciliaciones where id = $1',
      [conciliacionId],
    )
  )[0]!.total;

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Posfechados', usuario: 'propietarioposfechados' });
  autoriza = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Posfechados',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
});

describe('cheque cobrado antes de su fecha', () => {
  it('marcado en enero: cuadra con la partida que resta, la foto la guarda y en febrero ya no es candidato', async () => {
    const cuentaId = await cuentaConPosfechado();
    const enero = await iniciarMes(cuenta.propietario, cuentaId, 1);
    expect(enero.candidatos).toHaveLength(0);
    expect(enero.posfechadosCandidatos).toHaveLength(1);
    expect(enero.posfechadosCandidatos[0]).toMatchObject({ marcado: false, parteDeApertura: 'cheque_posfechado' });
    expect(enero.cuadratica.libros.saldoFinal).toBe('1000.00');

    const marcado = await marcar(cuenta.propietario, enero.id, idsDe(enero.posfechadosCandidatos));
    expect(marcado.partidas.cobradosAntesDeSuFecha).toEqual([expect.objectContaining({ monto: '100.00' })]);
    expect(marcado.cuadratica.banco).toMatchObject({
      saldoInicial: '1000.00',
      egresos: '100.00',
      saldoFinal: '900.00',
    });
    expect(marcado.saldoQueDebeMostrarElEstadoDeCuenta).toBe('900.00');

    await terminarYAutorizar(cuenta.propietario, autoriza, enero.id);
    expect(await fotoDe(enero.id)).toBe('100.00');
    const febrero = await iniciarMes(cuenta.propietario, cuentaId, 2);
    expect(febrero.candidatos).toHaveLength(0);
    expect(febrero.posfechadosCandidatos).toHaveLength(0);
    expect(febrero.cuadratica.libros).toMatchObject({ saldoInicial: '1000.00', saldoFinal: '900.00' });
    expect(febrero.saldoQueDebeMostrarElEstadoDeCuenta).toBe('900.00');
  });

  it('sin marcar en enero no es partida; en febrero entra a libros y es un cheque en circulación', async () => {
    const cuentaId = await cuentaConPosfechado();
    const enero = await iniciarMes(cuenta.propietario, cuentaId, 1);
    expect(enero.partidas.chequesEnCirculacion).toEqual([]);
    expect(enero.partidas.cobradosAntesDeSuFecha).toEqual([]);
    expect(enero.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1000.00');

    await terminarYAutorizar(cuenta.propietario, autoriza, enero.id);
    expect(await fotoDe(enero.id)).toBe('0.00');
    const febrero = await iniciarMes(cuenta.propietario, cuentaId, 2);
    expect(febrero.candidatos as Candidato[]).toHaveLength(1);
    expect(febrero.partidas.chequesEnCirculacion).toHaveLength(1);
    expect(febrero.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1000.00');
  });
});

describe('cuentas con el saldo global de antes y conciliaciones anteriores a la 0034', () => {
  it('el documento y la foto no cambian; la lista propone el mes del primer movimiento y luego el siguiente', async () => {
    const sinInicio = await darDeAltaCuenta(entorno, {
      nombre: 'Saldo global conciliado',
      usuario: 'propietariosaldoglobal',
      modulos: ['bancos'],
    });
    const usuario = sinInicio.propietario;
    const cuentaId = await crearCuentaSinSaldo(usuario);
    const lista = `/api/bancos/cuentas-bancarias/${cuentaId}/conciliaciones`;
    expect((await usuario.get(lista)).cuerpo).toEqual({ conciliaciones: [], periodoSiguiente: null });
    await usuario.post('/api/bancos/saldos-iniciales', {
      ...{ cuentaBancariaId: cuentaId, tipo: 'credito', fecha: '2026-01-01', monto: '1000.00' },
      ...{ referencia: null, observaciones: null },
    });
    expect((await usuario.get(lista)).cuerpo.periodoSiguiente).toEqual({ anio: 2026, mes: 1 });

    const enero = await iniciarMes(usuario, cuentaId, 1);
    expect(enero.saldoInicialDelBancoDeLaApertura).toBeNull();
    expect(enero.posfechadosCandidatos).toEqual([]);
    const marcado = await marcar(usuario, enero.id, idsDe(enero.candidatos));
    expect(marcado.cuadratica.banco).toMatchObject({ saldoInicial: '0.00', saldoFinal: '1000.00' });
    const otro = await crearUsuarioConPermisos(entorno, sinInicio, {
      nombres: 'Otro',
      apellidos: 'Global',
      permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
    });
    const autorizada = await terminarYAutorizar(usuario, otro, enero.id);

    // Una autorizada antes de la 0034 no tiene el total de cobrados antes de su fecha: se lee como cero y no cambia.
    await comoPropietario(
      'update bancos.conciliaciones set foto_total_cobrados_antes_de_su_fecha = null where id = $1',
      [enero.id],
    );
    const releida = (await usuario.get(`${RUTA}/${enero.id}`)).cuerpo;
    expect(releida.saldoQueDebeMostrarElEstadoDeCuenta).toBe(autorizada.saldoQueDebeMostrarElEstadoDeCuenta);
    expect(releida.partidas).toEqual(autorizada.partidas);
    expect(releida.cuadratica).toEqual(autorizada.cuadratica);
    expect((await usuario.get(lista)).cuerpo.periodoSiguiente).toEqual({ anio: 2026, mes: 2 });
  });
});
