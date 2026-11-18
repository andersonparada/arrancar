/**
 * BS-2: reglas de la cabecera y de las partidas de apertura por API (sin fecha de inicio, sin cabecera, movimientos
 * anteriores, fechas contra el corte y error del banco).
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { usarEntornoApi } from './soporte/entorno-api.js';
import { agregarPartida, empresaConInicio, fichaDe, guardarSaldo, partida } from './soporte/apertura-por-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
const usuario = () => cuenta.propietario;
const nuevaCuenta = () => crearCuentaSinSaldo(usuario());

/** Una cuenta con su saldo según el estado de cuenta ya cargado. */
async function cuentaConSaldo(saldo = '1000.00'): Promise<string> {
  const id = await nuevaCuenta();
  expect((await guardarSaldo(usuario(), id, saldo)).estado).toBe(200);
  return id;
}

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Reglas apertura', usuario: 'propietarioreglasapertura' });
});

describe('antes de empezar', () => {
  it('sin fecha de inicio no se carga nada (422)', async () => {
    const sinFecha = await darDeAltaCuenta(entorno, {
      nombre: 'Sin fecha de inicio',
      usuario: 'propietariosinfecha',
      modulos: ['bancos'],
    });
    const cuentaId = await crearCuentaSinSaldo(sinFecha.propietario);

    const respuesta = await guardarSaldo(sinFecha.propietario, cuentaId, '100.00');

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('sin_fecha_de_inicio');
    expect(respuesta.cuerpo.error.mensaje).toContain('Defina la fecha de inicio en Empresas');
  });

  it('una partida sin la cabecera de su cuenta se rechaza (422)', async () => {
    const respuesta = await agregarPartida(usuario(), await nuevaCuenta(), partida('deposito_en_transito'));

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('sin_saldo_inicial');
  });

  it('una cuenta con movimientos anteriores o iguales al corte no lleva saldo inicial (422)', async () => {
    const cuentaId = await nuevaCuenta();
    const nota = await usuario().post('/api/bancos/notas', {
      cuentaBancariaId: cuentaId,
      tipo: 'credito',
      fecha: '2025-12-15',
      monto: '50.00',
      referencia: 'Boleta vieja',
      observaciones: null,
      conceptoId: await conceptoGeneral(usuario()),
    });
    expect(nota.estado).toBe(201);

    const respuesta = await guardarSaldo(usuario(), cuentaId, '100.00');

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('cuenta_con_movimientos_anteriores');
    expect(respuesta.cuerpo.error.mensaje).toContain('1 movimientos anteriores a la fecha de inicio');
  });

  it('el saldo se guarda al corte, con el signo que dice si es crédito o débito', async () => {
    const positiva = await cuentaConSaldo('1500.50');
    const negativa = await nuevaCuenta();
    await guardarSaldo(usuario(), negativa, '-200.00');

    const fichaPositiva = await fichaDe(usuario(), positiva);
    const fichaNegativa = await fichaDe(usuario(), negativa);

    expect(fichaPositiva).toMatchObject({
      forma: 'con_partidas',
      fechaDeCorte: '2025-12-31',
      saldoSegunEstadoDeCuenta: '1500.50',
    });
    expect(fichaNegativa).toMatchObject({ saldoSegunEstadoDeCuenta: '-200.00', saldoEnLibrosAlCorte: '-200.00' });
    const [banco] = fichaPositiva.partidas;
    expect(banco).toMatchObject({ parte: 'saldo_del_banco', tipo: 'credito', fecha: '2025-12-31', monto: '1500.50' });
    expect(fichaNegativa.partidas[0]).toMatchObject({ tipo: 'debito', monto: '200.00' });
  });
});

describe('fechas de las partidas contra el corte', () => {
  it('toda partida es del corte o antes (400, campo fecha); el posfechado, posterior al corte', async () => {
    const cuentaId = await cuentaConSaldo();
    const concepto = await conceptoGeneral(usuario());

    const despues = await agregarPartida(usuario(), cuentaId, partida('deposito_en_transito', { fecha: '2026-01-01' }));
    const alCorte = await agregarPartida(usuario(), cuentaId, partida('deposito_en_transito', { fecha: '2025-12-31' }));
    const noPosterior = await agregarPartida(
      usuario(),
      cuentaId,
      partida('cheque_posfechado', { fecha: '2025-12-31', conceptoId: concepto }),
    );

    expect(despues.estado).toBe(400);
    expect(despues.cuerpo.error.codigo).toBe('partida_despues_del_corte');
    expect(despues.cuerpo.error.detalles.campo).toBe('fecha');
    expect(alCorte.estado).toBe(201);
    expect(noPosterior.estado).toBe(400);
    expect(noPosterior.cuerpo.error.codigo).toBe('posfechado_no_posterior');
    expect(noPosterior.cuerpo.error.mensaje).toContain('31/12/2025');
  });

  it('el posfechado pide un concepto de egreso', async () => {
    const cuentaId = await cuentaConSaldo();

    const sinConcepto = await agregarPartida(usuario(), cuentaId, partida('cheque_posfechado'));

    expect(sinConcepto.estado).toBe(400);
    expect(sinConcepto.cuerpo.error.codigo).toBe('concepto_obligatorio');
  });

  it('un cheque pide número y beneficiario', async () => {
    const cuentaId = await cuentaConSaldo();

    const sinNumero = await agregarPartida(
      usuario(),
      cuentaId,
      partida('cheque_en_circulacion', { numeroDeCheque: null }),
    );
    const sinBeneficiario = await agregarPartida(
      usuario(),
      cuentaId,
      partida('cheque_en_circulacion', { beneficiario: null }),
    );

    expect(sinNumero.cuerpo.error.codigo).toBe('numero_de_cheque_obligatorio');
    expect(sinBeneficiario.cuerpo.error.codigo).toBe('beneficiario_obligatorio');
  });
});

describe('error del banco', () => {
  it('pide sentido y descripción; con los dos sentidos suma o resta al saldo en libros', async () => {
    const cuentaId = await cuentaConSaldo('1000.00');

    const sinDescripcion = await agregarPartida(usuario(), cuentaId, partida('error_del_banco', { referencia: null }));
    const sinSentido = await agregarPartida(usuario(), cuentaId, partida('error_del_banco', { sentido: null }));
    const suma = await agregarPartida(usuario(), cuentaId, partida('error_del_banco', { monto: '80.00' }));
    const resta = await agregarPartida(
      usuario(),
      cuentaId,
      partida('error_del_banco', {
        monto: '30.00',
        sentido: 'debito',
        referencia: null,
        observaciones: 'Abonó de más',
      }),
    );

    expect(sinDescripcion.cuerpo.error.codigo).toBe('descripcion_del_error_obligatoria');
    expect(sinDescripcion.cuerpo.error.detalles.campo).toBe('observaciones');
    expect(sinSentido.cuerpo.error.codigo).toBe('sentido_del_error_obligatorio');
    expect([suma.estado, resta.estado]).toEqual([201, 201]);
    expect(await fichaDe(usuario(), cuentaId)).toMatchObject({
      totalErroresDelBanco: '50.00',
      saldoEnLibrosAlCorte: '1050.00',
    });
  });
});
