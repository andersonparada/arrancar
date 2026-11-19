import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../core/compartido/pruebas/dobles-compartidos.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import {
  InversoDentroDeLaApertura,
  MovimientoAntesDeLaApertura,
  MovimientoAntesDeLaFechaDeInicio,
} from '../dominio/errores-de-apertura.js';
import { MovimientoAntesDelSaldoInicial } from '../dominio/errores.js';
import { Movimiento } from '../dominio/movimiento.js';
import { cargaConFechaDeInicio, CARGA_SIN_FECHA_DE_INICIO } from '../pruebas/dobles-de-carga-inicial.js';
import { MovimientosEnMemoria, PoliticaDeSobregiroFija } from '../pruebas/dobles-de-movimientos.js';
import type { CargaInicial } from './puertos/carga-inicial.js';
import { ReglasDeLaCuenta } from './reglas-de-la-cuenta.js';

const operador = operadorDePrueba();
const empresaId = Identificador.nuevo<'Empresa'>();
const CUENTA = 'cuenta-1';

let registros: MovimientosEnMemoria;

const reglas = (carga: CargaInicial) =>
  new ReglasDeLaCuenta({
    consultas: registros,
    politicaDeSobregiro: new PoliticaDeSobregiroFija(true),
    cargaInicial: carga,
  });

const registrarNuevo = (r: ReglasDeLaCuenta, fecha: string, movimientoId?: string) =>
  r.revisar(operador, {
    cuentaBancariaId: CUENTA,
    movimientoId,
    queda: { fecha, saldoInicial: false },
    fechas: [fecha],
    diferencia: 0,
  });

async function conSaldoDelBanco(fecha = '2025-12-31') {
  const saldo = Movimiento.crear(
    empresaId,
    {
      cuentaBancariaId: CUENTA,
      tipo: 'credito',
      fecha,
      monto: '1000.00',
      saldoInicial: true,
      referencia: null,
      beneficiario: null,
      observaciones: null,
      conceptoId: 'saldo-inicial',
    },
    { apertura: { parte: 'saldo_del_banco', saldoInicialId: 'cabecera-1' } },
  );
  await registros.agregar(saldo);
}

beforeEach(() => {
  registros = new MovimientosEnMemoria();
});

describe('un movimiento normal y la apertura (§5.2)', () => {
  it('con saldo del banco al corte, una fecha del corte o anterior se rechaza con la ayuda; la del día siguiente pasa', async () => {
    await conSaldoDelBanco('2025-12-31');
    const r = reglas(cargaConFechaDeInicio('2026-01-01'));

    await expect(registrarNuevo(r, '2025-12-31')).rejects.toThrow(MovimientoAntesDeLaApertura);
    await expect(registrarNuevo(r, '2025-06-01')).rejects.toThrow('regístrela con una fecha posterior al corte');
    await expect(registrarNuevo(r, '2026-01-01')).resolves.toBeUndefined();
  });

  it('también al corregir un movimiento existente: llevarlo al corte se rechaza', async () => {
    await conSaldoDelBanco('2025-12-31');

    await expect(registrarNuevo(reglas(cargaConFechaDeInicio('2026-01-01')), '2025-12-31', 'otro-id')).rejects.toThrow(
      MovimientoAntesDeLaApertura,
    );
  });

  it('con un saldo global de antes sigue la regla de siempre: solo se rechaza una fecha anterior a la del saldo', async () => {
    const global = Movimiento.crear(
      empresaId,
      {
        cuentaBancariaId: CUENTA,
        tipo: 'credito',
        fecha: '2026-03-01',
        monto: '10.00',
        saldoInicial: true,
        referencia: null,
        beneficiario: null,
        observaciones: null,
        conceptoId: 'saldo-inicial',
      },
      { apertura: { parte: 'saldo_global', saldoInicialId: 'cabecera-1' } },
    );
    await registros.agregar(global);
    const r = reglas(cargaConFechaDeInicio('2026-01-01'));

    await expect(registrarNuevo(r, '2026-02-28')).rejects.toThrow(MovimientoAntesDelSaldoInicial);
    await expect(registrarNuevo(r, '2026-03-01')).resolves.toBeUndefined();
  });
});

describe('sin saldo inicial pero con fecha de inicio (P-6)', () => {
  it('un movimiento nuevo anterior a la fecha de inicio se rechaza; el de la fecha de inicio pasa', async () => {
    const r = reglas(cargaConFechaDeInicio('2026-01-01'));

    await expect(registrarNuevo(r, '2025-12-31')).rejects.toThrow(MovimientoAntesDeLaFechaDeInicio);
    await expect(registrarNuevo(r, '2026-01-01')).resolves.toBeUndefined();
  });

  it('corregir un movimiento que ya existía antes de la fecha de inicio no se toca', async () => {
    const r = reglas(cargaConFechaDeInicio('2026-01-01'));

    await expect(registrarNuevo(r, '2025-11-15', 'ya-existia')).resolves.toBeUndefined();
  });

  it('una empresa sin fecha de inicio no rechaza nada', async () => {
    await expect(registrarNuevo(reglas(CARGA_SIN_FECHA_DE_INICIO), '2020-01-01')).resolves.toBeUndefined();
  });
});

describe('la fecha del inverso de una partida de apertura', () => {
  it('debe ser posterior al corte (el día anterior a la fecha de inicio)', async () => {
    const r = reglas(cargaConFechaDeInicio('2026-01-01'));

    await expect(r.revisarElInversoDeApertura(operador, '2025-12-31')).rejects.toThrow(InversoDentroDeLaApertura);
    await expect(r.revisarElInversoDeApertura(operador, '2025-01-01')).rejects.toThrow(InversoDentroDeLaApertura);
    await expect(r.revisarElInversoDeApertura(operador, '2026-01-01')).resolves.toBeUndefined();
  });
});
