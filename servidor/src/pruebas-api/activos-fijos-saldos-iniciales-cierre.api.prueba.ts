/**
 * Saldos iniciales de activos fijos (AF-6) frente al cierre de la carga inicial y a los cierres mensuales de depreciación:
 * el primer mes exige la carga cerrada (AF-P21), la acumulada del saldo corre con las cuotas y, con la carga cerrada o
 * con meses cerrados, los saldos ya no se tocan.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { claseDe } from './soporte/escenario-de-activos.js';
import {
  cargarSaldo,
  datosDeSaldo,
  fijarFechaDeInicio,
  rutaDeCarga,
  SALDOS,
} from './soporte/escenario-de-saldos-de-activos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const DEPRECIACION = '/api/activos-fijos/depreciacion';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let vehiculosId: string;
let camionId: string;

const cerrarMes = (periodo: string) => cuenta.propietario.post(`${DEPRECIACION}/${periodo}/cerrar`, {});
const reabrirMes = (periodo: string) =>
  cuenta.propietario.post(`${DEPRECIACION}/${periodo}/reabrir`, { motivo: 'Corregir un saldo' });

const cuotasDe = (periodo: string) =>
  comoPropietario<{ libro: string; monto: string; acumulada: string }>(
    `select c.libro, c.monto, c.acumulada from activos_fijos.cuotas c
       join core.empresas e on e.id = c.empresa_id
      where e.cuenta_id = $1 and c.periodo = $2 and c.vigente order by c.libro`,
    [cuenta.cuentaId, periodo],
  );

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Saldos cierre', usuario: 'propietariosaldoscierre', modulos });
  vehiculosId = await claseDe(cuenta, 'Vehículos');
  await fijarFechaDeInicio(cuenta, '2026-01-01');
  camionId = (await cargarSaldo(cuenta, vehiculosId)).activoId;
});

describe('con la carga inicial abierta', () => {
  it('el primer mes no se cierra: la revisión bloquea hasta que se cierre la carga (AF-P21)', async () => {
    const revision = await cuenta.propietario.get(`${DEPRECIACION}/2026-01-01/revision`);
    const cierre = await cerrarMes('2026-01-01');

    expect(revision.cuerpo.puedeCerrar).toBe(false);
    expect(revision.cuerpo.hallazgos.map((h: { codigo: string }) => h.codigo)).toContain('carga_inicial_abierta');
    expect(cierre.estado).toBe(422);
  });

  it('cerrar la carga con Activos fijos respondiendo la revisión no pide motivo y deja a los saldos quietos', async () => {
    const cerrada = await cuenta.propietario.post(rutaDeCarga(cuenta, 'cerrar'));

    expect(cerrada.estado, JSON.stringify(cerrada.cuerpo)).toBe(200);
    const lista = (await cuenta.propietario.get(SALDOS)).cuerpo;
    expect(lista.cargaCerrada).toBe(true);
    for (const intento of [
      await cuenta.propietario.post(SALDOS, datosDeSaldo(vehiculosId, { descripcion: 'Otro' })),
      await cuenta.propietario.put(`${SALDOS}/${camionId}`, datosDeSaldo(vehiculosId)),
      await cuenta.propietario.delete(`${SALDOS}/${camionId}`),
    ]) {
      expect(intento.estado).toBe(422);
      expect(intento.cuerpo.error.codigo).toBe('carga_inicial_cerrada');
    }
  });
});

describe('los cierres mensuales parten del saldo inicial', () => {
  it('el primer mes da las cuotas del tramo y la acumulada sigue desde lo que el saldo ya traía', async () => {
    const revision = await cuenta.propietario.get(`${DEPRECIACION}/2026-01-01/revision`);
    const cierre = await cerrarMes('2026-01-01');

    expect(revision.cuerpo.totales).toMatchObject({ contable: '1944.44', fiscal: '2000.00', activosDepreciados: 1 });
    expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);
    expect(await cuotasDe('2026-01-01')).toEqual([
      { libro: 'contable', monto: '1944.44', acumulada: '51944.44' },
      { libro: 'fiscal', monto: '2000.00', acumulada: '74000.00' },
    ]);
  });

  it('el segundo mes suma la cuota anterior a la acumulada del saldo', async () => {
    const cierre = await cerrarMes('2026-02-01');

    expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);
    expect(await cuotasDe('2026-02-01')).toEqual([
      { libro: 'contable', monto: '1944.44', acumulada: '53888.88' },
      { libro: 'fiscal', monto: '2000.00', acumulada: '76000.00' },
    ]);
  });
});

describe('con meses cerrados', () => {
  it('aunque la carga se reabra, el saldo no se corrige ni se elimina y la fecha de inicio no se mueve', async () => {
    const reabierta = await cuenta.propietario.post(rutaDeCarga(cuenta, 'reabrir'), { motivo: 'Revisar un saldo' });

    const corregir = await cuenta.propietario.put(`${SALDOS}/${camionId}`, datosDeSaldo(vehiculosId));
    const eliminar = await cuenta.propietario.delete(`${SALDOS}/${camionId}`);
    const fecha = await fijarFechaDeInicio(cuenta, '2026-02-01');

    expect(reabierta.estado, JSON.stringify(reabierta.cuerpo)).toBe(200);
    expect([corregir.estado, eliminar.estado, fecha.estado]).toEqual([422, 422, 422]);
    expect(corregir.cuerpo.error.codigo).toBe('saldos_con_cierres');
    expect(eliminar.cuerpo.error.codigo).toBe('saldos_con_cierres');
    expect(fecha.cuerpo.error.codigo).toBe('activos_con_fecha_fuera_de_la_carga');
  });

  it('al reabrir los meses el saldo vuelve a poder corregirse y los tramos nuevos arrancan limpios', async () => {
    expect((await reabrirMes('2026-02-01')).estado).toBe(200);
    expect((await reabrirMes('2026-01-01')).estado).toBe(200);

    const corregido = await cuenta.propietario.put(
      `${SALDOS}/${camionId}`,
      datosDeSaldo(vehiculosId, { depreciacionAcumuladaContable: '60000.00' }),
    );

    expect(corregido.estado, JSON.stringify(corregido.cuerpo)).toBe(200);
    const revision = await cuenta.propietario.get(`${DEPRECIACION}/2026-01-01/revision`);
    expect(revision.cuerpo.totales).toMatchObject({ contable: '1666.67', fiscal: '2000.00' });
  });
});
