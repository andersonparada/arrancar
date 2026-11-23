/**
 * Saldos iniciales de inventario (INV-7) frente a la carga inicial de Empresas: la pregunta del cierre (de toda la empresa,
 * aunque quien cierra no vea todas las bodegas), el aviso del cambio de la fecha de inicio y la carga cerrada.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearArticulo, crearBodega, entrada, type EscenarioDeKardex } from './soporte/escenario-de-kardex.js';
import { fijarFechaDeInicio, rutaDeCarga } from './soporte/escenario-de-saldos-de-activos.js';
import {
  cargarSaldoInicial,
  datosDeSaldoInicial,
  prepararSaldos,
  SALDOS_DE_INVENTARIO,
} from './soporte/escenario-de-saldos-de-inventario.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;
let otraBodega: string;
let sinBodegas: ClienteApi;

const revision = async (cliente: ClienteApi = e.cuenta.propietario) => {
  const respuesta = await cliente.get(rutaDeCarga(e.cuenta, 'revision-de-cierre'));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return (
    respuesta.cuerpo.modulos as {
      nombreDelModulo: string;
      hallazgos: { codigo: string }[];
      cifras: any[];
      resumen: string;
    }[]
  ).find((modulo) => modulo.nombreDelModulo === 'Inventarios')!;
};

beforeAll(async () => {
  e = await prepararSaldos(entorno, 'saldoscarga', { metodo: 'promedio_ponderado' });
  otraBodega = await crearBodega(e.cuenta.propietario);
  sinBodegas = await crearUsuarioConPermisos(entorno, e.cuenta, {
    nombres: 'Cierra',
    apellidos: 'Carga',
    permisos: ['empresas.ver', 'empresas.editar', 'empresas.carga-inicial.cerrar'],
  });
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('la pregunta del cierre de la carga', () => {
  it('sin saldos avisa que no hay existencias y nunca pide motivo', async () => {
    const modulo = await revision();

    expect(modulo.hallazgos.map((h) => h.codigo)).toEqual(['sin_saldos_iniciales']);
    expect(modulo.hallazgos[0]).toMatchObject({ nivel: 'aviso' });
  });

  it('con saldos en dos bodegas da las cifras de toda la empresa a quien no ve ninguna bodega', async () => {
    await cargarSaldoInicial(e.cuenta.propietario, datosDeSaldoInicial(e, '100', '200.00'));
    const otro = await crearArticulo(e.cuenta.propietario, e.referencias);
    await cargarSaldoInicial(
      e.cuenta.propietario,
      datosDeSaldoInicial({ articuloId: otro, bodegaId: otraBodega }, '10', '0.00'),
    );

    const delPropietario = await revision();
    const sinVerBodegas = await revision(sinBodegas);

    expect(sinVerBodegas).toEqual(delPropietario);
    expect(delPropietario.hallazgos.map((h) => h.codigo)).toEqual(['existencias_sin_costo', 'sin_conteo_de_respaldo']);
    expect(delPropietario.resumen).toBe('2 artículos por Q200.00 en 2 bodegas al 31/08/2026');
    const total = delPropietario.cifras.find((c) => c.clave === 'valor_del_inventario');
    const porBodega = delPropietario.cifras.filter((c) => c.clave === 'valor_por_bodega');
    expect(total).toMatchObject({ tipo: 'monto', valor: '200.00' });
    expect(porBodega.map((c) => c.valor).sort()).toEqual(['0.00', '200.00']);
  });
});

describe('cambiar la fecha de inicio', () => {
  it('mueve los saldos de todas las bodegas al nuevo día anterior, también a quien no ve las bodegas', async () => {
    const cambio = await fijarFechaDeInicio(e.cuenta, '2026-10-01');
    const cambioSinBodegas = await sinBodegas.put(`/api/empresas/${e.cuenta.empresaId}/carga-inicial`, {
      fechaDeInicio: '2026-09-15',
    });

    expect(cambio.estado, JSON.stringify(cambio.cuerpo)).toBe(200);
    expect(cambioSinBodegas.estado, JSON.stringify(cambioSinBodegas.cuerpo)).toBe(200);
    const fechas = await comoPropietario<{ documento: string; movimiento: string; capa: string }>(
      `select distinct d.fecha::text as documento, m.fecha::text as movimiento, m.fecha_de_capa::text as capa
         from inventarios.documentos d join inventarios.movimientos m on m.documento_id = d.id
        where d.empresa_id = $1 and d.clase = 'saldo_inicial'`,
      [e.cuenta.empresaId],
    );
    expect(fechas).toEqual([{ documento: '2026-09-14', movimiento: '2026-09-14', capa: '2026-09-14' }]);
  });

  it('se rechaza si un movimiento que no es saldo queda antes de la nueva fecha', async () => {
    await entrada(e.cuenta.propietario, {
      bodegaId: e.bodegaId,
      fecha: '2026-09-20',
      renglones: [{ articuloId: e.articuloId, cantidad: '5', costoTotal: '10.00' }],
    });

    const rechazo = await fijarFechaDeInicio(e.cuenta, '2026-09-25');
    const permitido = await fijarFechaDeInicio(e.cuenta, '2026-09-10');

    expect(rechazo.estado).toBe(422);
    expect(rechazo.cuerpo.error.codigo).toBe('inventario_con_fecha_fuera_de_la_carga');
    expect(permitido.estado).toBe(200);
  });

  it('se rechaza si la fecha de la capa de un saldo quedaría igual o posterior', async () => {
    const lista = (await e.cuenta.propietario.get(SALDOS_DE_INVENTARIO)).cuerpo;
    const saldo = lista.saldos[0];
    const corregido = await e.cuenta.propietario.put(`${SALDOS_DE_INVENTARIO}/${saldo.id}`, {
      ...datosDeSaldoInicial({ articuloId: saldo.articuloId, bodegaId: saldo.bodegaId }, '100', '200.00'),
      fechaDeCapa: '2026-09-05',
    });

    const rechazo = await fijarFechaDeInicio(e.cuenta, '2026-09-05');

    expect(corregido.estado, JSON.stringify(corregido.cuerpo)).toBe(200);
    expect(rechazo.estado).toBe(422);
    expect(rechazo.cuerpo.error.codigo).toBe('inventario_con_fecha_fuera_de_la_carga');
  });
});

describe('con la carga cerrada', () => {
  it('no se carga, corrige ni elimina nada hasta reabrirla', async () => {
    const saldo = (await e.cuenta.propietario.get(SALDOS_DE_INVENTARIO)).cuerpo.saldos[0];
    const cerrada = await e.cuenta.propietario.post(rutaDeCarga(e.cuenta, 'cerrar'), {});
    expect(cerrada.estado, JSON.stringify(cerrada.cuerpo)).toBe(200);

    const intentos = [
      await e.cuenta.propietario.post(SALDOS_DE_INVENTARIO, datosDeSaldoInicial(e, '1', '1.00')),
      await e.cuenta.propietario.put(`${SALDOS_DE_INVENTARIO}/${saldo.id}`, datosDeSaldoInicial(e, '1', '1.00')),
      await e.cuenta.propietario.delete(`${SALDOS_DE_INVENTARIO}/${saldo.id}`),
    ];

    for (const intento of intentos) expect(intento.cuerpo.error.codigo).toBe('carga_inicial_cerrada');
    expect((await e.cuenta.propietario.get(SALDOS_DE_INVENTARIO)).cuerpo.cargaCerrada).toBe(true);
  });
});
