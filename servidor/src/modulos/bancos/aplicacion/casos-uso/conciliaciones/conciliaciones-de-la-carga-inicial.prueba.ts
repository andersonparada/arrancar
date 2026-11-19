import { describe, expect, it } from 'vitest';
import { cargaConFechaDeInicio } from '../../../pruebas/dobles-de-carga-inicial.js';
import { PrimeraConciliacionDeOtroMes } from '../../../dominio/errores-de-apertura.js';
import {
  agregarMovimiento,
  casosDeUsoDeConciliaciones,
  CUENTA,
  inicio,
  operador,
} from './soporte-de-pruebas-de-conciliaciones.js';

const entornoConSaldoDelBanco = async () => {
  const entorno = casosDeUsoDeConciliaciones(cargaConFechaDeInicio('2026-01-01'));
  await agregarMovimiento(entorno.movimientos, {
    ...{ fecha: '2025-12-31', monto: '1000.00', saldoInicial: true },
    parte: 'saldo_del_banco',
  });
  return entorno;
};

describe('la primera conciliación de una cuenta con saldo del banco', () => {
  it('solo puede ser del mes de la fecha de inicio', async () => {
    const entorno = await entornoConSaldoDelBanco();

    await expect(entorno.casos.iniciar.ejecutar(operador, inicio({ mes: 3 }))).rejects.toThrow(
      PrimeraConciliacionDeOtroMes,
    );
    const enero = await entorno.casos.iniciar.ejecutar(operador, inicio({ mes: 1 }));
    expect(enero).toMatchObject({
      mes: 1,
      saldoInicialDelBancoDeLaApertura: { fecha: '2025-12-31', monto: '1000.00' },
    });
    expect(enero.candidatos).toHaveLength(0);
    expect(enero.cuadratica.banco.saldoInicial).toBe('1000.00');
  });

  it('con el saldo del banco en cero (solo cabecera) también', async () => {
    const entorno = casosDeUsoDeConciliaciones(cargaConFechaDeInicio('2026-01-01'));
    entorno.conciliaciones.conCabeceraSinSaldo.add(CUENTA);

    await expect(entorno.casos.iniciar.ejecutar(operador, inicio({ mes: 2 }))).rejects.toThrow(
      PrimeraConciliacionDeOtroMes,
    );
  });

  it('una cuenta sin saldo del banco sigue pudiendo empezar en cualquier mes', async () => {
    const entorno = casosDeUsoDeConciliaciones(cargaConFechaDeInicio('2026-01-01'));
    await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-01', monto: '1000.00', saldoInicial: true });

    const marzo = await entorno.casos.iniciar.ejecutar(operador, inicio({ mes: 3 }));
    expect(marzo.saldoInicialDelBancoDeLaApertura).toBeNull();
  });
});

describe('el periodo que propone la lista', () => {
  it('sin conciliaciones: el de la fecha de inicio con saldo del banco, o el del primer movimiento', async () => {
    const conSaldo = await entornoConSaldoDelBanco();
    expect((await conSaldo.casos.listar.ejecutar(operador, CUENTA)).periodoSiguiente).toEqual({ anio: 2026, mes: 1 });

    const sinSaldo = casosDeUsoDeConciliaciones(cargaConFechaDeInicio('2026-01-01'));
    expect((await sinSaldo.casos.listar.ejecutar(operador, CUENTA)).periodoSiguiente).toBeNull();
    await agregarMovimiento(sinSaldo.movimientos, { fecha: '2026-03-10', monto: '10.00' });
    expect((await sinSaldo.casos.listar.ejecutar(operador, CUENTA)).periodoSiguiente).toEqual({ anio: 2026, mes: 3 });
  });

  it('con conciliaciones: el mes siguiente a la última', async () => {
    const entorno = await entornoConSaldoDelBanco();
    await entorno.casos.iniciar.ejecutar(operador, inicio({ mes: 1 }));

    expect((await entorno.casos.listar.ejecutar(operador, CUENTA)).periodoSiguiente).toEqual({ anio: 2026, mes: 2 });
  });
});

describe('cheques de fecha posterior', () => {
  it('marcados restan del saldo del estado de cuenta; sin marcar no son partida', async () => {
    const entorno = await entornoConSaldoDelBanco();
    const posfechado = await agregarMovimiento(entorno.movimientos, {
      ...{ fecha: '2026-02-10', monto: '100.00', tipo: 'cheque' },
      parte: 'cheque_posfechado',
    });
    const enero = await entorno.casos.iniciar.ejecutar(operador, inicio({ mes: 1 }));

    expect(enero.posfechadosCandidatos.map((c) => c.id)).toEqual([posfechado]);
    expect(enero.partidas.cobradosAntesDeSuFecha).toEqual([]);
    expect(enero.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1000.00');

    const marcado = await entorno.casos.marcar.ejecutar(operador, {
      conciliacionId: enero.id,
      movimientoIds: [posfechado],
    });
    expect(marcado.partidas.cobradosAntesDeSuFecha).toHaveLength(1);
    expect(marcado.saldoQueDebeMostrarElEstadoDeCuenta).toBe('900.00');
    expect(marcado.cuadratica.banco.saldoFinal).toBe('900.00');
  });
});
