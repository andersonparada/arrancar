import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { conceptoGeneral, crearCuentaBancaria, inversosDe } from './soporte/escenarios-de-bancos.js';

const RUTA_NOTAS = '/api/bancos/notas';
const RUTA_TRANSFERENCIAS = '/api/bancos/transferencias';
const RUTA_MOVIMIENTOS = '/api/bancos/movimientos';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

let conceptoId = '';

const nota = (cuentaBancariaId: string, cambios: Record<string, unknown> = {}) => ({
  cuentaBancariaId,
  conceptoId,
  tipo: 'credito',
  fecha: '2026-02-01',
  monto: '100.00',
  referencia: 'Boleta 1',
  beneficiario: null,
  observaciones: null,
  ...cambios,
});

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Anulaciones',
    usuario: 'propietarioanulaciones',
    modulos: ['bancos'],
  });
  conceptoId = await conceptoGeneral(cuenta.propietario);
});

describe('anular notas con fecha y eliminar lo limpio, por API', () => {
  let cuentaBancariaId: string;

  beforeAll(async () => {
    cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Cuenta de notas');
  });

  it('el servidor dice qué se puede hacer; anular usa la fecha escrita y no admite una anterior', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, nota(cuentaBancariaId));
    expect(creada.cuerpo).toMatchObject({ puedeAnular: true, puedeEliminar: true });

    const anteriorAlOriginal = await cuenta.propietario.post(`${RUTA_NOTAS}/${creada.cuerpo.id}/anular`, {
      motivo: 'Error',
      fecha: '2026-01-31',
    });
    const anulada = await cuenta.propietario.post(`${RUTA_NOTAS}/${creada.cuerpo.id}/anular`, {
      motivo: 'Error',
      fecha: '2026-02-10',
    });

    expect(anteriorAlOriginal.cuerpo.error.codigo).toBe('fecha_de_reversion_anterior');
    expect(anulada.cuerpo).toMatchObject({ revertidoEn: expect.any(String), puedeAnular: false, puedeEliminar: false });
    const inversa = (await cuenta.propietario.get(RUTA_NOTAS)).cuerpo.find(
      (n: { revierteAId: string | null }) => n.revierteAId === creada.cuerpo.id,
    );
    expect(inversa).toMatchObject({ tipo: 'debito', fecha: '2026-02-10', puedeAnular: false, puedeEliminar: false });
  });

  it('ni el original revertido ni su inverso se eliminan', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, nota(cuentaBancariaId));
    await cuenta.propietario.post(`${RUTA_NOTAS}/${creada.cuerpo.id}/anular`, { motivo: 'Error' });
    const inversa = (await cuenta.propietario.get(RUTA_NOTAS)).cuerpo.find(
      (n: { revierteAId: string | null }) => n.revierteAId === creada.cuerpo.id,
    );

    const alOriginal = await cuenta.propietario.delete(`${RUTA_NOTAS}/${creada.cuerpo.id}`, { motivo: 'x' });
    const alInverso = await cuenta.propietario.delete(`${RUTA_NOTAS}/${inversa.id}`, { motivo: 'x' });

    expect(alOriginal.cuerpo.error.codigo).toBe('no_se_elimina_un_movimiento_revertido');
    expect(alInverso.cuerpo.error.codigo).toBe('no_se_elimina_un_inverso');
  });

  it('el saldo inicial se elimina solo con su permiso', async () => {
    const otra = await crearCuentaBancaria(cuenta.propietario, 'Cuenta de saldo a eliminar');
    const saldos = (await cuenta.propietario.get(`/api/bancos/saldos-iniciales?cuentaBancariaId=${otra}`)).cuerpo;
    const sinPermiso = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Sin',
      apellidos: 'Gestionar saldos',
      permisos: ['bancos.cuentas-bancarias.ver'],
    });

    expect(saldos[0]).toMatchObject({ puedeAnular: false, puedeEliminar: true });
    expect((await sinPermiso.delete(`/api/bancos/saldos-iniciales/${saldos[0].id}`, { motivo: 'x' })).estado).toBe(403);
    expect(
      (await cuenta.propietario.delete(`/api/bancos/saldos-iniciales/${saldos[0].id}`, { motivo: 'x' })).estado,
    ).toBe(204);
  });
});

describe('transferencias: anular con fecha y eliminar, por API', () => {
  let origen: string;
  let destino: string;
  const datos = () => ({
    cuentaOrigenId: origen,
    cuentaDestinoId: destino,
    fecha: '2026-02-01',
    monto: '250.00',
    referencia: 'TRF',
    observaciones: null,
  });

  beforeAll(async () => {
    origen = await crearCuentaBancaria(cuenta.propietario, 'Origen de anulaciones');
    destino = await crearCuentaBancaria(cuenta.propietario, 'Destino de anulaciones');
  });

  it('se elimina con sus dos notas si están limpias, y queda en 404', async () => {
    const registrada = await cuenta.propietario.post(RUTA_TRANSFERENCIAS, datos());
    expect(registrada.cuerpo).toMatchObject({ puedeAnular: true, puedeEliminar: true });

    const eliminada = await cuenta.propietario.delete(`${RUTA_TRANSFERENCIAS}/${registrada.cuerpo.id}`, {
      motivo: 'Registrada por error',
    });

    expect(eliminada.estado).toBe(204);
    expect((await cuenta.propietario.get(`${RUTA_TRANSFERENCIAS}/${registrada.cuerpo.id}`)).estado).toBe(404);
    expect((await cuenta.propietario.get(`${RUTA_MOVIMIENTOS}/${registrada.cuerpo.movimientoOrigenId}`)).estado).toBe(
      404,
    );
  });

  it('anulada con fecha: los inversos llevan esa fecha y ya no se elimina', async () => {
    const registrada = await cuenta.propietario.post(RUTA_TRANSFERENCIAS, datos());

    const anulada = await cuenta.propietario.post(`${RUTA_TRANSFERENCIAS}/${registrada.cuerpo.id}/anular`, {
      motivo: 'Duplicada',
      fecha: '2026-02-15',
    });
    const alEliminar = await cuenta.propietario.delete(`${RUTA_TRANSFERENCIAS}/${registrada.cuerpo.id}`, {
      motivo: 'x',
    });

    expect(anulada.cuerpo).toMatchObject({ puedeAnular: false, puedeEliminar: false });
    expect(alEliminar.estado).toBe(422);
    expect(await inversosDe(cuenta.propietario, origen)).toEqual([
      expect.objectContaining({ tipo: 'credito', fecha: '2026-02-15' }),
    ]);
  });

  it('sin bancos.transferencias.eliminar, eliminar responde 403', async () => {
    const registrada = await cuenta.propietario.post(RUTA_TRANSFERENCIAS, datos());
    const gestor = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Registra',
      apellidos: 'Sin eliminar',
      permisos: ['bancos.transferencias.ver', 'bancos.transferencias.crear', 'bancos.transferencias.anular'],
    });

    const respuesta = await gestor.delete(`${RUTA_TRANSFERENCIAS}/${registrada.cuerpo.id}`, { motivo: 'Sin permiso' });

    expect(respuesta.estado).toBe(403);
  });
});
