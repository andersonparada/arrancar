import { beforeAll, describe, expect, it } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import '../modulos/core/contratos/bancos.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { cuentaConChequera, MODULOS_CON_CUENTAS_POR_PAGAR, operadorDeLaCuenta } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
const CODIGO = 'cheque_posfechado_sin_fondos';
let cuenta: CuentaDePrueba;
let operador: Operador;
let cuentaBancariaId = '';
let chequeraId = '';
let conceptoId = '';

const enDias = (dias: number): string => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

async function emitir(fecha: string, monto: string) {
  const siguiente = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`);
  const respuesta = await cuenta.propietario.post(`/api/bancos/cheques/${siguiente.cuerpo.id}/emitir`, {
    fecha,
    monto,
    beneficiario: 'Proveedor S.A.',
    noNegociable: true,
    conceptoId,
    referencia: null,
    observaciones: null,
  });
  expect(respuesta.estado).toBe(200);
  return { ...respuesta.cuerpo, chequeId: siguiente.cuerpo.id as string };
}

/** Una entrada de dinero con fecha futura: sube el saldo total, pero no el de hoy. */
async function depositoFuturo(): Promise<void> {
  const entrada = await cuenta.propietario.post('/api/bancos/notas', {
    cuentaBancariaId,
    tipo: 'credito',
    fecha: enDias(60),
    monto: '5000.00',
    referencia: 'Depósito esperado',
    beneficiario: null,
    observaciones: null,
    conceptoId,
  });
  expect(entrada.estado).toBe(201);
}

const codigos = (avisos: Array<{ codigo: string }>) => avisos.map((aviso) => aviso.codigo);

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Posfechados',
    usuario: 'propietarioposfechados',
    modulos: MODULOS_CON_CUENTAS_POR_PAGAR,
  });
  operador = await operadorDeLaCuenta(cuenta);
  conceptoId = await conceptoGeneral(cuenta.propietario);
  ({ cuentaBancariaId, chequeraId } = await cuentaConChequera(cuenta.propietario, 'Cuenta de posfechados'));
  await depositoFuturo();
});

describe('aviso de fondos de un cheque posfechado (desde Bancos)', () => {
  it('con fondos de hoy para todos los posfechados no avisa; un cheque de hoy tampoco', async () => {
    const posfechado = await emitir(enDias(30), '400.00');
    const dehoy = await emitir(enDias(0), '100.00');

    expect(posfechado.avisos).toEqual([]);
    expect(dehoy.avisos).toEqual([]);
  });

  it('avisa, sin bloquear, cuando el saldo de hoy menos los posfechados vigentes no alcanza', async () => {
    const primero = await emitir(enDias(30), '300.00');
    const segundo = await emitir(enDias(31), '300.00');

    expect(primero.avisos).toEqual([]);
    expect(codigos(segundo.avisos)).toEqual([CODIGO]);
    expect(segundo.avisos[0].mensaje).toContain('Código de Comercio, art. 501');
    expect(segundo.avisos[0].mensaje).toContain('Código Penal, art. 268');
  });

  it('un posfechado anulado deja de contar', async () => {
    const propia = await cuentaConChequera(cuenta.propietario, 'Cuenta de anulados');
    cuentaBancariaId = propia.cuentaBancariaId;
    await depositoFuturo();
    const aAnular = await emitir(enDias(40), '600.00');
    const queda = await emitir(enDias(41), '600.00');
    expect(codigos(queda.avisos)).toEqual([CODIGO]);

    await cuenta.propietario.post(`/api/bancos/cheques/${aAnular.chequeId}/anular`, { motivo: 'No se entregó' });
    const ahora = await emitir(enDias(42), '400.00');

    expect(ahora.avisos).toEqual([]);
  });
});

describe('aviso de fondos de un cheque posfechado (desde otro módulo)', () => {
  it('la orden de emitir lo devuelve en sus avisos', async () => {
    const respuesta = await mediador.enviar(operador, 'bancos.emitir_cheque_de_origen', {
      origen: { modulo: 'cuentas-por-pagar', documentoId: crypto.randomUUID() },
      chequeraId,
      fecha: enDias(50),
      montoCentavos: 90000,
      beneficiario: 'Proveedor S.A.',
      noNegociable: true,
      conceptos: [{ claveDeSistema: 'pago_a_proveedor', montoCentavos: 90000 }],
    });

    expect(codigos(respuesta.avisos)).toEqual([CODIGO]);
  });
});
