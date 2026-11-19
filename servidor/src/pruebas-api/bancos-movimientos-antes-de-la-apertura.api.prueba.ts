/**
 * BS-3 (§5.2): con saldo inicial del banco, una nota, un cheque o una orden de otro módulo con fecha del corte o anterior se
 * rechaza (con la ayuda para las notas descubiertas después); sin saldo inicial, un movimiento nuevo no puede ser anterior
 * a la fecha de inicio (P-6) pero lo que ya existía no se toca.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/bancos.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { empresaConInicio, guardarSaldo } from './soporte/apertura-por-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { MODULOS_CON_CUENTAS_POR_PAGAR, operadorDeLaCuenta } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let conceptoId = '';
const usuario = () => cuenta.propietario;

const nota = (cuentaBancariaId: string, fecha: string, cambios: Record<string, unknown> = {}) =>
  usuario().post('/api/bancos/notas', {
    cuentaBancariaId,
    tipo: 'credito',
    fecha,
    monto: '50.00',
    referencia: null,
    beneficiario: null,
    observaciones: null,
    conceptoId,
    ...cambios,
  });

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, {
    nombre: 'Antes de la apertura',
    usuario: 'propietarioantesapertura',
    modulos: MODULOS_CON_CUENTAS_POR_PAGAR,
  });
  conceptoId = await conceptoGeneral(usuario());
});

describe('una cuenta con el saldo del banco al corte (2025-12-31)', () => {
  it('una nota con fecha del corte o anterior se rechaza (422) con la ayuda; la del primer mes pasa', async () => {
    const cuentaId = await crearCuentaSinSaldo(usuario());
    await guardarSaldo(usuario(), cuentaId, '1000.00');

    const delCorte = await nota(cuentaId, '2025-12-31');
    const anterior = await nota(cuentaId, '2025-11-30', { tipo: 'debito' });
    const primerMes = await nota(cuentaId, '2026-01-02');

    for (const rechazada of [delCorte, anterior]) {
      expect(rechazada.estado).toBe(422);
      expect(rechazada.cuerpo.error.codigo).toBe('movimiento_antes_de_la_apertura');
      expect(rechazada.cuerpo.error.mensaje).toContain('La cuenta tiene saldo inicial al 31/12/2025');
      expect(rechazada.cuerpo.error.mensaje).toContain('regístrela con una fecha posterior al corte');
      expect(rechazada.cuerpo.error.mensaje).toContain('avise a su contador');
    }
    expect(primerMes.estado).toBe(201);
  });

  it('corregir una nota para llevarla al corte también se rechaza', async () => {
    const cuentaId = await crearCuentaSinSaldo(usuario());
    await guardarSaldo(usuario(), cuentaId, '1000.00');
    const creada = await nota(cuentaId, '2026-01-10');

    const corregida = await usuario().put(`/api/bancos/notas/${creada.cuerpo.id}`, {
      cuentaBancariaId: cuentaId,
      tipo: 'credito',
      fecha: '2025-12-30',
      monto: '50.00',
      referencia: null,
      beneficiario: null,
      observaciones: null,
      conceptoId,
    });

    expect(corregida.estado).toBe(422);
    expect(corregida.cuerpo.error.codigo).toBe('movimiento_antes_de_la_apertura');
  });

  it('un cheque emitido con fecha anterior al corte se rechaza', async () => {
    const cuentaId = await crearCuentaSinSaldo(usuario());
    await guardarSaldo(usuario(), cuentaId, '1000.00');
    await usuario().post(`/api/bancos/cuentas-bancarias/${cuentaId}/chequeras`, { serie: null, desde: 1, hasta: 10 });
    const siguiente = await usuario().get(`/api/bancos/cuentas-bancarias/${cuentaId}/siguiente-cheque`);

    const emitido = await usuario().post(`/api/bancos/cheques/${siguiente.cuerpo.id}/emitir`, {
      fecha: '2025-12-15',
      monto: '10.00',
      beneficiario: 'Proveedor',
      noNegociable: true,
      conceptoId,
      referencia: null,
      observaciones: null,
    });

    expect(emitido.estado).toBe(422);
    expect(emitido.cuerpo.error.codigo).toBe('movimiento_antes_de_la_apertura');
  });

  it('una orden de otro módulo (nota de origen) con fecha anterior al corte se rechaza con el mismo error', async () => {
    const cuentaId = await crearCuentaSinSaldo(usuario());
    await guardarSaldo(usuario(), cuentaId, '1000.00');
    const operador = await operadorDeLaCuenta(cuenta);

    const orden = mediador.enviar(operador, 'bancos.registrar_nota_de_origen', {
      origen: { modulo: 'cuentas-por-pagar', documentoId: crypto.randomUUID() },
      cuentaBancariaId: cuentaId,
      tipo: 'debito',
      fecha: '2025-12-20',
      montoCentavos: 5000,
      beneficiario: 'Proveedor S.A.',
      conceptos: [{ claveDeSistema: 'pago_a_proveedor', montoCentavos: 5000 }],
    });

    await expect(orden).rejects.toMatchObject({ codigo: 'movimiento_antes_de_la_apertura' });
  });

  it('con el saldo del banco en cero la regla es la misma (la fecha de inicio)', async () => {
    const cuentaId = await crearCuentaSinSaldo(usuario());
    await guardarSaldo(usuario(), cuentaId, '0.00');

    const rechazada = await nota(cuentaId, '2025-12-31');

    expect(rechazada.estado).toBe(422);
    expect(rechazada.cuerpo.error.codigo).toBe('movimiento_antes_de_la_fecha_de_inicio');
  });
});

describe('una cuenta sin saldo inicial en una empresa con fecha de inicio (P-6)', () => {
  it('un movimiento nuevo anterior a la fecha de inicio se rechaza (422) con la fecha de la empresa; el de la fecha de inicio pasa', async () => {
    const cuentaId = await crearCuentaSinSaldo(usuario());

    const anterior = await nota(cuentaId, '2025-12-31');
    const deInicio = await nota(cuentaId, '2026-01-01');

    expect(anterior.estado).toBe(422);
    expect(anterior.cuerpo.error.codigo).toBe('movimiento_antes_de_la_fecha_de_inicio');
    expect(anterior.cuerpo.error.mensaje).toContain('La empresa empezó el 01/01/2026');
    expect(deInicio.estado).toBe(201);
  });

  it('corregir una nota posterior a la fecha de inicio hacia una fecha anterior se rechaza (422)', async () => {
    const cuentaId = await crearCuentaSinSaldo(usuario());
    const registrada = await nota(cuentaId, '2026-01-10');

    const corregida = await usuario().put(`/api/bancos/notas/${registrada.cuerpo.id}`, {
      cuentaBancariaId: cuentaId,
      tipo: 'credito',
      fecha: '2025-06-01',
      monto: '50.00',
      referencia: null,
      beneficiario: null,
      observaciones: null,
      conceptoId,
    });

    expect(corregida.estado).toBe(422);
    expect(corregida.cuerpo.error.codigo).toBe('movimiento_antes_de_la_fecha_de_inicio');
  });

  it('los movimientos que ya existían antes de la fecha de inicio no se tocan: se pueden corregir', async () => {
    const vieja = await darDeAltaCuenta(entorno, {
      nombre: 'Historia previa',
      usuario: 'propietariohistoriaprevia',
      modulos: ['bancos'],
    });
    const cuentaId = await crearCuentaSinSaldo(vieja.propietario);
    const concepto = await conceptoGeneral(vieja.propietario);
    const cuerpo = (monto: string) => ({
      cuentaBancariaId: cuentaId,
      tipo: 'credito',
      fecha: '2025-12-10',
      monto,
      referencia: null,
      beneficiario: null,
      observaciones: null,
      conceptoId: concepto,
    });
    const registrada = await vieja.propietario.post('/api/bancos/notas', cuerpo('5.00'));
    await vieja.propietario.put(`/api/empresas/${vieja.empresaId}/carga-inicial`, { fechaDeInicio: '2026-01-01' });

    const corregida = await vieja.propietario.put(`/api/bancos/notas/${registrada.cuerpo.id}`, cuerpo('7.00'));
    const nueva = await vieja.propietario.post('/api/bancos/notas', cuerpo('9.00'));

    expect(registrada.estado).toBe(201);
    expect(corregida.estado).toBe(200);
    expect(nueva.estado).toBe(422);
    expect(nueva.cuerpo.error.codigo).toBe('movimiento_antes_de_la_fecha_de_inicio');
  });
});
