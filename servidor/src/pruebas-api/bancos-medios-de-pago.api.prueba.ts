import { beforeAll, describe, expect, it } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import '../modulos/core/contratos/bancos.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { cuentaConChequera, MODULOS_CON_CUENTAS_POR_PAGAR, operadorDeLaCuenta } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
const FECHA = '2026-02-10';
let cuenta: CuentaDePrueba;
let operador: Operador;
let cuentaBancariaId = '';
let chequeraId = '';

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Medios',
    usuario: 'propietariomedios',
    modulos: MODULOS_CON_CUENTAS_POR_PAGAR,
  });
  operador = await operadorDeLaCuenta(cuenta);
  ({ cuentaBancariaId, chequeraId } = await cuentaConChequera(cuenta.propietario, 'Cuenta de medios'));
});

describe('bancos.medios_de_pago', () => {
  it('lista las cuentas activas con su saldo a la fecha y el siguiente cheque de cada chequera activa', async () => {
    const medios = await mediador.enviar(operador, 'bancos.medios_de_pago', { fecha: FECHA });

    const delaCuenta = medios.cuentas.find((c) => c.cuentaBancariaId === cuentaBancariaId)!;
    expect(delaCuenta.saldoCentavos).toBe(100000);
    expect(delaCuenta.chequeras).toEqual([
      expect.objectContaining({ chequeraId, serie: null, siguienteNumero: 1, siguienteChequeId: expect.any(String) }),
    ]);
  });

  it('no incluye las cuentas inactivas ni las chequeras inactivas', async () => {
    const inactiva = await cuentaConChequera(cuenta.propietario, 'Cuenta inactiva');
    await cuenta.propietario.post(`/api/bancos/chequeras/${inactiva.chequeraId}/inactivar`, {});
    const { cuerpo } = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${inactiva.cuentaBancariaId}`);
    await cuenta.propietario.put(`/api/bancos/cuentas-bancarias/${inactiva.cuentaBancariaId}`, {
      ...cuerpo,
      activo: false,
    });

    const medios = await mediador.enviar(operador, 'bancos.medios_de_pago', { fecha: FECHA });

    expect(medios.cuentas.map((c) => c.cuentaBancariaId)).not.toContain(inactiva.cuentaBancariaId);
  });
});
