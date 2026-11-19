/**
 * Saldos iniciales de activos fijos (AF-6): cargar el activo comprado hace años que aún se deprecia, corregir y eliminar
 * con su auditoría, el aviso del cambio de la fecha de inicio, la revisión del cierre de la carga (EM-2), permisos y
 * aislamiento entre cuentas.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
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
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let ajena: CuentaDePrueba;
let soloVer: ClienteApi;
let vehiculosId: string;
let camionId: string;

const auditoria = (accion: string) =>
  comoPropietario<{ anterior: Record<string, unknown>; registro_id: string }>(
    `select a.anterior, a.registro_id from core.auditoria a join core.empresas e on e.id = a.empresa_id
      where e.cuenta_id = $1 and a.recurso = 'activos-fijos.saldos-iniciales' and a.accion = $2 order by a.creado_en`,
    [cuenta.cuentaId, accion],
  );

const filasDe = (tabla: string, activoId: string) =>
  comoPropietario<Record<string, any>>(`select * from activos_fijos.${tabla} where activo_id = $1 order by creado_en`, [
    activoId,
  ]);

/** La fecha de un costo o el mes de un tramo, como texto (pg vuelve las fechas objetos con zona horaria). */
const fechasDe = (tabla: 'costos' | 'tramos', activoId: string) =>
  comoPropietario<{ fecha: string }>(
    `select ${tabla === 'costos' ? 'fecha' : 'desde_periodo'}::text as fecha from activos_fijos.${tabla}
      where activo_id = $1 order by creado_en`,
    [activoId],
  );

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Saldos AF', usuario: 'propietariosaldosaf', modulos });
  ajena = await darDeAltaCuenta(entorno, { nombre: 'Saldos AF ajena', usuario: 'propietariosaldosafajeno', modulos });
  soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Solo',
    apellidos: 'Saldos',
    permisos: ['activos-fijos.saldos-iniciales.ver'],
  });
  vehiculosId = await claseDe(cuenta, 'Vehículos');
});

describe('sin fecha de inicio', () => {
  it('no se carga nada: primero se fija la fecha de inicio de la empresa', async () => {
    const respuesta = await cuenta.propietario.post(SALDOS, datosDeSaldo(vehiculosId));

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('saldo_inicial_sin_fecha_de_inicio');
    expect((await fijarFechaDeInicio(cuenta, '2026-03-01')).estado).toBe(200);
  });
});

describe('cargar el activo comprado hace años', () => {
  it('crea el activo en uso, su costo, su saldo, el traslado del alta y los dos tramos desde el mes de inicio', async () => {
    const saldo = await cargarSaldo(cuenta, vehiculosId, { cantidad: 3, enBodega: true });
    camionId = saldo.activoId;

    expect(saldo).toMatchObject({
      codigo: 'AF-0001',
      fechaDeCorte: '2026-02-28',
      costo: '120000.00',
      valorEnLibros: '70000.00',
      costoFiscal: '120000.00',
      baseFiscal: '120000.00',
      depreciacionAcumuladaFiscal: '72000.00',
      cantidad: 3,
      enBodega: true,
    });
    const ficha = (await cuenta.propietario.get(`/api/activos-fijos/activos/${camionId}`)).cuerpo;
    expect(ficha).toMatchObject({ origen: 'saldo_inicial', estado: 'en_uso', costo: '120000.00', enBodega: true });
    expect(ficha.tramos).toEqual([
      expect.objectContaining({ libro: 'contable', causa: 'saldo_inicial', desdePeriodo: '2026-03-01' }),
      expect.objectContaining({ libro: 'fiscal', causa: 'saldo_inicial', desdePeriodo: '2026-03-01' }),
    ]);
    expect(ficha.tramos.map((t: { porDepreciar: string }) => t.porDepreciar)).toEqual(['70000.00', '48000.00']);
    expect(ficha.tramos.map((t: { cuotaMensual: string }) => t.cuotaMensual)).toEqual(['1944.44', '2000.00']);
    expect(ficha.traslados).toEqual([expect.objectContaining({ esAlta: true, aBodega: true })]);
    expect(await filasDe('costos', camionId)).toEqual([
      expect.objectContaining({ origen: 'saldo_inicial', monto: '120000.00' }),
    ]);
    expect(await fechasDe('costos', camionId)).toEqual([{ fecha: '2026-02-28' }]);
  });

  it('la lista trae el estado de la carga y el cuadre; la ficha del saldo, sus montos', async () => {
    const lista = (await cuenta.propietario.get(SALDOS)).cuerpo;
    const uno = (await cuenta.propietario.get(`${SALDOS}/${camionId}`)).cuerpo;

    expect(lista).toMatchObject({ fechaDeInicio: '2026-03-01', fechaDeCorte: '2026-02-28', cargaCerrada: false });
    expect(lista.totales).toMatchObject({ activos: 1, costo: '120000.00', valorEnLibros: '70000.00' });
    expect(lista.porClase).toEqual([expect.objectContaining({ clase: 'Vehículos', costo: '120000.00' })]);
    expect(uno).toMatchObject({ activoId: camionId, depreciacionAcumuladaContable: '50000.00' });
  });

  it('un activo con fechas que no caben en la carga o con montos imposibles se rechaza completo', async () => {
    const adquisicion = await cuenta.propietario.post(
      SALDOS,
      datosDeSaldo(vehiculosId, { fechaDeAdquisicion: '2026-03-01' }),
    );
    const acumulada = await cuenta.propietario.post(
      SALDOS,
      datosDeSaldo(vehiculosId, { depreciacionAcumuladaContable: '120000.01' }),
    );
    const sinCosto = await cuenta.propietario.post(SALDOS, { ...datosDeSaldo(vehiculosId), costo: undefined });

    expect([adquisicion.estado, acumulada.estado, sinCosto.estado]).toEqual([400, 400, 400]);
    expect(adquisicion.cuerpo.error.codigo).toBe('saldo_inicial_invalido');
    expect((await cuenta.propietario.get(SALDOS)).cuerpo.totales.activos).toBe(1);
  });

  it('en las pantallas generales no se elimina ni se quita de uso: se corrige en Saldos iniciales', async () => {
    const eliminar = await cuenta.propietario.delete(`/api/activos-fijos/activos/${camionId}`);
    const quitar = await cuenta.propietario.post(`/api/activos-fijos/activos/${camionId}/quitar-de-uso`, {});

    expect([eliminar.estado, quitar.estado]).toEqual([422, 422]);
    expect(eliminar.cuerpo.error.codigo).toBe('activo_de_saldo_inicial');
    expect(quitar.cuerpo.error.codigo).toBe('activo_de_saldo_inicial');
  });
});

describe('la revisión del cierre de la carga (EM-2)', () => {
  it('Empresas trae la respuesta de Activos fijos con su cuadre y sus avisos', async () => {
    const revision = (await cuenta.propietario.get(rutaDeCarga(cuenta, 'revision-de-cierre'))).cuerpo;

    const modulo = revision.modulos.find((m: { nombreDelModulo: string }) => m.nombreDelModulo === 'Activos fijos');
    expect(modulo.resumen).toBe('1 activo de saldo inicial al 28/02/2026');
    expect(modulo.ruta).toBe('/activos-fijos/saldos-iniciales');
    expect(modulo.hallazgos.map((h: { codigo: string }) => h.codigo)).toEqual(['sin_ubicacion']);
    expect(modulo.cifras.find((c: { clave: string }) => c.clave === 'valor_en_libros').valor).toBe('70000.00');
    expect(revision.pideMotivo).toBe(false);
  });
});

describe('el aviso de cambio de la fecha de inicio', () => {
  it('rechaza una fecha que deja el saldo con adquisición o uso igual o posterior, y no cambia nada', async () => {
    const rechazo = await fijarFechaDeInicio(cuenta, '2024-01-15');

    expect(rechazo.estado).toBe(422);
    expect(rechazo.cuerpo.error.codigo).toBe('activos_con_fecha_fuera_de_la_carga');
    expect((await cuenta.propietario.get(SALDOS)).cuerpo.fechaDeInicio).toBe('2026-03-01');
  });

  it('una fecha posterior mueve el día de corte, el costo y el mes de los tramos', async () => {
    expect((await fijarFechaDeInicio(cuenta, '2026-06-01')).estado).toBe(200);

    expect((await cuenta.propietario.get(`${SALDOS}/${camionId}`)).cuerpo.fechaDeCorte).toBe('2026-05-31');
    expect(await fechasDe('tramos', camionId)).toEqual([{ fecha: '2026-06-01' }, { fecha: '2026-06-01' }]);
    expect(await fechasDe('costos', camionId)).toEqual([{ fecha: '2026-05-31' }]);
    expect((await fijarFechaDeInicio(cuenta, '2026-03-01')).estado).toBe(200);
  });
});

describe('corregir y eliminar', () => {
  it('corregir rehace el costo y los tramos y audita `corregir` con cómo estaba', async () => {
    const corregido = await cuenta.propietario.put(
      `${SALDOS}/${camionId}`,
      datosDeSaldo(vehiculosId, {
        costo: '150000.00',
        depreciacionAcumuladaContable: '30000.00',
        vidaUtilRestanteMeses: 48,
      }),
    );

    expect(corregido.estado, JSON.stringify(corregido.cuerpo)).toBe(200);
    expect(corregido.cuerpo).toMatchObject({ codigo: 'AF-0001', costo: '150000.00', valorEnLibros: '120000.00' });
    const tramos = await filasDe('tramos', camionId);
    expect(tramos.filter((t) => t.vigente)).toHaveLength(2);
    expect((await auditoria('corregir'))[0]!.anterior).toMatchObject({ costo: '120000.00', codigo: 'AF-0001' });
  });

  it('eliminar quita el activo con todo lo suyo y audita `eliminar`; lo que no existe da 404', async () => {
    const otro = await cargarSaldo(cuenta, vehiculosId, { descripcion: 'Montacargas' });

    const eliminado = await cuenta.propietario.delete(`${SALDOS}/${otro.activoId}`);

    expect(eliminado.estado).toBe(204);
    expect(await filasDe('costos', otro.activoId)).toEqual([]);
    expect(await filasDe('saldos_iniciales', otro.activoId)).toEqual([]);
    expect((await auditoria('eliminar'))[0]).toMatchObject({ registro_id: otro.activoId });
    expect((await cuenta.propietario.get(`${SALDOS}/${otro.activoId}`)).estado).toBe(404);
  });
});

describe('permisos y aislamiento', () => {
  it('quien solo ve, ve; no crea, corrige ni elimina ni exporta', async () => {
    expect((await soloVer.get(SALDOS)).estado).toBe(200);
    expect((await soloVer.post(SALDOS, datosDeSaldo(vehiculosId))).estado).toBe(403);
    expect((await soloVer.put(`${SALDOS}/${camionId}`, datosDeSaldo(vehiculosId))).estado).toBe(403);
    expect((await soloVer.delete(`${SALDOS}/${camionId}`)).estado).toBe(403);
    expect((await soloVer.get(`${SALDOS}/exportar`)).estado).toBe(403);
  });

  it('otra cuenta no ve los saldos y tampoco puede abrirlos por su id', async () => {
    await fijarFechaDeInicio(ajena, '2026-03-01');
    const lista = (await ajena.propietario.get(SALDOS)).cuerpo;

    expect(lista.saldos).toEqual([]);
    expect((await ajena.propietario.get(`${SALDOS}/${camionId}`)).estado).toBe(404);
    expect((await ajena.propietario.delete(`${SALDOS}/${camionId}`)).estado).toBe(404);
  });
});
