import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaBancariaId: string;

const nota = (cambios: Record<string, unknown>) => ({
  cuentaBancariaId,
  tipo: 'credito',
  fecha: '2026-01-10',
  monto: '75.00',
  referencia: null,
  beneficiario: null,
  observaciones: null,
  ...cambios,
});

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Compensadas',
    usuario: 'propietariocompensadas',
    modulos: ['bancos'],
  });
  cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Cuenta con anulaciones');
});

describe('conciliar un original y su inverso que nunca pasaron por el banco, por API', () => {
  it('se marcan juntos, compensados, y no quedan como partidas en tránsito', async () => {
    const creada = await cuenta.propietario.post('/api/bancos/notas', nota({}));
    await cuenta.propietario.post(`/api/bancos/notas/${creada.cuerpo.id}/anular`, {
      motivo: 'Error de captura',
      fecha: '2026-01-20',
    });
    const iniciada = await cuenta.propietario.post('/api/bancos/conciliaciones', {
      cuentaBancariaId,
      anio: 2026,
      mes: 1,
    });
    // Ya al iniciar, la pareja aparece marcada sola.
    expect((iniciada.cuerpo.candidatos as Array<{ marcado: boolean }>).filter((m) => m.marcado)).toHaveLength(2);
    const idSaldoInicial = (iniciada.cuerpo.candidatos as Array<{ id: string; saldoInicial: boolean }>).find(
      (m) => m.saldoInicial,
    )!.id;

    const marcada = await cuenta.propietario.put(`/api/bancos/conciliaciones/${iniciada.cuerpo.id}/marcas`, {
      movimientoIds: [idSaldoInicial],
    });

    const marcados = (marcada.cuerpo.candidatos as Array<{ id: string; marcado: boolean }>).filter((m) => m.marcado);
    expect(marcados).toHaveLength(3);
    expect(marcados.map((m) => m.id)).toContain(creada.cuerpo.id);
    expect(marcada.cuerpo.partidas).toEqual({
      chequesEnCirculacion: [],
      otrosDebitosEnTransito: [],
      creditosEnTransito: [],
    });
    expect(marcada.cuerpo.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1000.00');
  });
});
