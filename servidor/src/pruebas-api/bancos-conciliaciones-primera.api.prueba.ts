import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta } from './soporte/escenarios.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';

const entorno = usarEntornoApi();
let propietario: ClienteApi;
let cuentaBancariaId: string;
let conceptoId = '';

async function crearCuentaConSaldoInicial(): Promise<string> {
  const banco = await propietario.post('/api/bancos/bancos', { nombre: 'Banco', observaciones: null, activo: true });
  const cuentaBancaria = await propietario.post('/api/bancos/cuentas-bancarias', {
    nombre: 'Cuenta primera',
    bancoId: banco.cuerpo.id as string,
    numero: 'primera',
    tipo: 'monetaria',
    observaciones: null,
    activo: true,
  });
  await propietario.post('/api/bancos/saldos-iniciales', {
    cuentaBancariaId: cuentaBancaria.cuerpo.id,
    tipo: 'credito',
    fecha: '2026-01-01',
    monto: '10000.00',
    referencia: null,
    observaciones: null,
  });
  return cuentaBancaria.cuerpo.id as string;
}

async function nota(tipo: 'credito' | 'debito', fecha: string, monto: string): Promise<string> {
  const respuesta = await propietario.post('/api/bancos/notas', {
    cuentaBancariaId,
    tipo,
    conceptoId,
    fecha,
    monto,
    referencia: null,
    beneficiario: null,
    observaciones: null,
  });
  return respuesta.cuerpo.id as string;
}

beforeAll(async () => {
  const cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Primera conciliacion',
    usuario: 'propietarioprimeraconciliacion',
    modulos: ['bancos'],
  });
  propietario = cuenta.propietario;
  cuentaBancariaId = await crearCuentaConSaldoInicial();
  conceptoId = await conceptoGeneral(propietario);
});

describe('primera conciliación de una cuenta que empieza en un mes posterior al saldo inicial', () => {
  it('el saldo inicial no se cuenta dos veces: el banco cuadra con el estado de cuenta esperado', async () => {
    const credito = await nota('credito', '2026-02-10', '2500.50');
    const debito = await nota('debito', '2026-02-20', '2750.50');
    const iniciada = await propietario.post('/api/bancos/conciliaciones', { cuentaBancariaId, anio: 2026, mes: 2 });
    const id = iniciada.cuerpo.id as string;
    const candidatos = iniciada.cuerpo.candidatos as Array<{ id: string; saldoInicial: boolean }>;
    const idSaldoInicial = candidatos.find((m) => m.saldoInicial)!.id;

    const sinMarcar = await propietario.get(`/api/bancos/conciliaciones/${id}`);
    expect(sinMarcar.cuerpo.saldoQueDebeMostrarElEstadoDeCuenta).toBe('0.00');

    const marcado = await propietario.put(`/api/bancos/conciliaciones/${id}/marcas`, {
      movimientoIds: [idSaldoInicial, credito, debito],
    });
    expect(marcado.cuerpo.saldoQueDebeMostrarElEstadoDeCuenta).toBe('9750.00');
    expect(marcado.cuerpo.cuadratica.banco).toEqual({
      saldoInicial: '0.00',
      ingresos: '12500.50',
      egresos: '2750.50',
      saldoFinal: '9750.00',
    });
    expect(marcado.cuerpo.cuadratica.libros.saldoFinal).toBe('9750.00');
  });

  it('un monto mayor que numeric(14,2) responde 400 y no 500', async () => {
    const respuesta = await propietario.post('/api/bancos/notas', {
      cuentaBancariaId,
      tipo: 'credito',
      conceptoId,
      fecha: '2026-02-11',
      monto: '1000000000000.00',
      referencia: null,
      beneficiario: null,
      observaciones: null,
    });
    expect(respuesta.estado).toBe(400);
  });
});
