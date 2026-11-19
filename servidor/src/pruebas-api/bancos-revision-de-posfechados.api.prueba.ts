/**
 * AP-0: Bancos agrega a la revisión del cierre de la carga el hallazgo `posfechados_sin_ligar` (aviso, sin motivo), solo
 * si Cuentas por pagar está activo y solo por los posfechados de apertura que ningún pago ha ligado.
 */
import { describe, expect, it } from 'vitest';
import { empresaConInicio, guardarSaldo } from './soporte/apertura-por-api.js';
import { MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import type { CuentaDePrueba } from './soporte/escenarios.js';
import { crearPosfechadoDeApertura, ligarPosfechadoComoPropietario } from './soporte/posfechados-de-apertura.js';

const entorno = usarEntornoApi();

const bancosDeLaRevision = async (usuario: CuentaDePrueba) => {
  const { estado, cuerpo } = await usuario.propietario.get(
    `/api/empresas/${usuario.empresaId}/carga-inicial/revision-de-cierre`,
  );
  expect(estado, JSON.stringify(cuerpo)).toBe(200);
  const modulo = (cuerpo.modulos as Array<{ nombreDelModulo: string; hallazgos: Array<{ codigo: string }> }>).find(
    (m) => m.nombreDelModulo === 'Bancos',
  );
  return { pideMotivo: cuerpo.pideMotivo as boolean, hallazgos: modulo?.hallazgos ?? [] };
};
const posfechadosSinLigar = (hallazgos: Array<{ codigo: string }>) =>
  hallazgos.filter((h) => h.codigo === 'posfechados_sin_ligar');

async function empresaConCuenta(usuario: string, modulos: string[]) {
  const cuenta = await empresaConInicio(entorno, { nombre: usuario, usuario, modulos });
  const cuentaId = await crearCuentaSinSaldo(cuenta.propietario);
  await guardarSaldo(cuenta.propietario, cuentaId, {
    saldoSegunEstadoDeCuenta: '500.00',
    saldoSegunLibrosAnteriores: '500.00',
  });
  return { cuenta, cuentaId };
}

describe('posfechados de apertura sin ligar en la revisión del cierre', () => {
  it('con Cuentas por pagar activo avisa la cantidad y el total, sin pedir motivo', async () => {
    const { cuenta, cuentaId } = await empresaConCuenta('posfechadosconcp', MODULOS_DE_CUENTAS_POR_PAGAR);
    await crearPosfechadoDeApertura(cuenta.propietario, cuentaId, { monto: '100.00', beneficiario: 'Proveedor Uno' });
    await crearPosfechadoDeApertura(cuenta.propietario, cuentaId, { monto: '250.50', beneficiario: 'Proveedor Dos' });

    const revision = await cuenta.propietario.get(`/api/empresas/${cuenta.empresaId}/carga-inicial/revision-de-cierre`);
    const bancos = revision.cuerpo.modulos.find((m: { nombreDelModulo: string }) => m.nombreDelModulo === 'Bancos');

    expect(posfechadosSinLigar(bancos.hallazgos)).toEqual([
      {
        codigo: 'posfechados_sin_ligar',
        nivel: 'aviso',
        mensaje: expect.stringMatching(/Hay 2 cheques posfechados de apertura sin ligar \(Q 350\.50\)/),
        registro: null,
      },
    ]);
    expect(revision.cuerpo.pideMotivo).toBe(false);
  });

  it('con un solo posfechado habla en singular', async () => {
    const { cuenta, cuentaId } = await empresaConCuenta('posfechadosuno', MODULOS_DE_CUENTAS_POR_PAGAR);
    await crearPosfechadoDeApertura(cuenta.propietario, cuentaId, { monto: '75.00', beneficiario: 'Proveedor Uno' });

    const { hallazgos } = await bancosDeLaRevision(cuenta);

    expect(posfechadosSinLigar(hallazgos)).toEqual([
      expect.objectContaining({
        mensaje: expect.stringContaining('Hay 1 cheque posfechado de apertura sin ligar (Q 75.00)'),
      }),
    ]);
  });

  it('los posfechados ligados a un pago no cuentan: el aviso baja y luego desaparece', async () => {
    const { cuenta, cuentaId } = await empresaConCuenta('posfechadosligados', MODULOS_DE_CUENTAS_POR_PAGAR);
    const primero = await crearPosfechadoDeApertura(cuenta.propietario, cuentaId, {
      monto: '100.00',
      beneficiario: 'A',
    });
    const segundo = await crearPosfechadoDeApertura(cuenta.propietario, cuentaId, {
      monto: '40.00',
      beneficiario: 'B',
    });

    await ligarPosfechadoComoPropietario(primero);
    const conUno = await bancosDeLaRevision(cuenta);
    await ligarPosfechadoComoPropietario(segundo);
    const sinNinguno = await bancosDeLaRevision(cuenta);

    expect(posfechadosSinLigar(conUno.hallazgos)).toEqual([
      expect.objectContaining({
        mensaje: expect.stringContaining('Hay 1 cheque posfechado de apertura sin ligar (Q 40.00)'),
      }),
    ]);
    expect(posfechadosSinLigar(sinNinguno.hallazgos)).toEqual([]);
  });

  it('sin posfechados no hay hallazgo', async () => {
    const { cuenta } = await empresaConCuenta('posfechadosninguno', MODULOS_DE_CUENTAS_POR_PAGAR);

    expect(posfechadosSinLigar((await bancosDeLaRevision(cuenta)).hallazgos)).toEqual([]);
  });

  it('sin Cuentas por pagar activo no hay hallazgo aunque haya posfechados', async () => {
    const { cuenta, cuentaId } = await empresaConCuenta('posfechadossincp', ['bancos']);
    await crearPosfechadoDeApertura(cuenta.propietario, cuentaId, { monto: '100.00', beneficiario: 'Proveedor Uno' });

    expect(posfechadosSinLigar((await bancosDeLaRevision(cuenta)).hallazgos)).toEqual([]);
  });
});
