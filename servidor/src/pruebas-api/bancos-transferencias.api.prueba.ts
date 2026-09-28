import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/bancos/transferencias';
const RUTA_MOVIMIENTOS = '/api/bancos/movimientos';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

/** Un banco y una cuenta bancaria activa, registrados en la cuenta del usuario. */
async function crearCuentaBancaria(usuario: ClienteApi, nombre: string) {
  const banco = await usuario.post('/api/bancos/bancos', { nombre, observaciones: null, activo: true });
  const cuentaBancaria = await usuario.post('/api/bancos/cuentas-bancarias', {
    nombre,
    bancoId: banco.cuerpo.id as string,
    numero: nombre,
    tipo: 'monetaria',
    observaciones: null,
    activo: true,
  });
  await usuario.post('/api/bancos/saldos-iniciales', {
    cuentaBancariaId: cuentaBancaria.cuerpo.id,
    tipo: 'credito',
    fecha: '2026-01-01',
    monto: '1000.00',
    referencia: null,
    observaciones: null,
  });
  return cuentaBancaria.cuerpo.id as string;
}

let origen: string;
let destino: string;

const datos = (cambios: Record<string, unknown> = {}) => ({
  cuentaOrigenId: origen,
  cuentaDestinoId: destino,
  fecha: '2026-02-01',
  monto: '250.00',
  referencia: 'Boleta 9',
  observaciones: 'Una nota de prueba.',
  ...cambios,
});

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Transferencias',
    usuario: 'propietariotransfer',
    modulos: ['bancos'],
  });
  origen = await crearCuentaBancaria(cuenta.propietario, 'Origen');
  destino = await crearCuentaBancaria(cuenta.propietario, 'Destino');
});

describe('transferencias por API', () => {
  it('registra el débito y el crédito, y ambos aparecen en movimientos con los saldos correctos', async () => {
    const registrada = await cuenta.propietario.post(RUTA, datos());

    expect(registrada.estado).toBe(201);
    expect(registrada.cuerpo.cuentaOrigenNombre).toBe('Origen');
    expect(registrada.cuerpo.cuentaDestinoNombre).toBe('Destino');

    const reporte = await cuenta.propietario.get(`${RUTA_MOVIMIENTOS}/reporte?desde=2026-02-01&hasta=2026-02-01`);
    const ids = reporte.cuerpo.filas.map((m: { id: string }) => m.id);
    expect(ids).toEqual(
      expect.arrayContaining([registrada.cuerpo.movimientoOrigenId, registrada.cuerpo.movimientoDestinoId]),
    );

    const cuentaOrigen = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${origen}`);
    const cuentaDestino = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${destino}`);
    expect(cuentaOrigen.cuerpo.saldo).toBe('750.00');
    expect(cuentaDestino.cuerpo.saldo).toBe('1250.00');
  });

  it('se ve por su id', async () => {
    const registrada = await cuenta.propietario.post(RUTA, datos());

    const obtenida = await cuenta.propietario.get(`${RUTA}/${registrada.cuerpo.id}`);

    expect(obtenida.cuerpo).toEqual(registrada.cuerpo);
  });

  it('se anula con motivo y deja ambas notas anuladas', async () => {
    const registrada = await cuenta.propietario.post(RUTA, datos());

    const anulada = await cuenta.propietario.post(`${RUTA}/${registrada.cuerpo.id}/anular`, { motivo: 'Duplicada' });

    expect(anulada.estado).toBe(200);
    expect(anulada.cuerpo.anuladaEn).toEqual(expect.any(String));
    const origenAnulado = await cuenta.propietario.get(`${RUTA_MOVIMIENTOS}/${registrada.cuerpo.movimientoOrigenId}`);
    const destinoAnulado = await cuenta.propietario.get(`${RUTA_MOVIMIENTOS}/${registrada.cuerpo.movimientoDestinoId}`);
    expect(origenAnulado.cuerpo.anuladoEn).toEqual(expect.any(String));
    expect(destinoAnulado.cuerpo.anuladoEn).toEqual(expect.any(String));
  });

  it('sin permisos, registrar y anular responden 403', async () => {
    const registrada = await cuenta.propietario.post(RUTA, datos());
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['bancos.transferencias.ver'],
    });

    expect((await lector.post(RUTA, datos())).estado).toBe(403);
    expect((await lector.post(`${RUTA}/${registrada.cuerpo.id}/anular`, { motivo: 'Sin permiso' })).estado).toBe(403);
  });

  it('no se acepta una nota de transferencia por la ventana de notas', async () => {
    const registrada = await cuenta.propietario.post(RUTA, datos());

    const corregido = await cuenta.propietario.put(`/api/bancos/notas/${registrada.cuerpo.movimientoOrigenId}`, {
      cuentaBancariaId: origen,
      tipo: 'debito',
      fecha: '2026-02-01',
      monto: '250.00',
      referencia: null,
      beneficiario: null,
      observaciones: null,
    });
    const anulado = await cuenta.propietario.post(`/api/bancos/notas/${registrada.cuerpo.movimientoDestinoId}/anular`, {
      motivo: 'Error',
    });

    expect(corregido.cuerpo.error.codigo).toBe('movimiento_de_transferencia');
    expect(anulado.cuerpo.error.codigo).toBe('movimiento_de_transferencia');
  });

  it('se listan filtrando por cuenta, sea como origen o como destino', async () => {
    const origenPropio = await crearCuentaBancaria(cuenta.propietario, 'Origen filtro');
    const destinoPropio = await crearCuentaBancaria(cuenta.propietario, 'Destino filtro');
    const registrada = await cuenta.propietario.post(
      RUTA,
      datos({ cuentaOrigenId: origenPropio, cuentaDestinoId: destinoPropio }),
    );

    const porOrigen = await cuenta.propietario.get(`${RUTA}?cuentaBancariaId=${origenPropio}`);
    const porDestino = await cuenta.propietario.get(`${RUTA}?cuentaBancariaId=${destinoPropio}`);

    expect(porOrigen.estado).toBe(200);
    expect(porOrigen.cuerpo.map((t: { id: string }) => t.id)).toContain(registrada.cuerpo.id);
    expect(porDestino.cuerpo.map((t: { id: string }) => t.id)).toContain(registrada.cuerpo.id);
  });
});
