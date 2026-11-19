/**
 * Cerrar un fondo de Caja chica (CC-7, §5.8): lo pendiente se liquida en una reposición compensada (sin cheque ni nota),
 * el efectivo que queda se deposita con una nota de crédito, el fondo queda cerrado y auditado «cerrar»; y lo que se
 * rechaza (vales abiertos, fecha, cuenta, permisos, alcance, fondo ya cerrado) y lo que un fondo cerrado ya no admite.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  RUTA_DE_ACCESOS,
  RUTA_DE_FONDOS,
  cambiosEnBase,
  fondoEnBase,
  movimientoDeBancos,
  sembrarVale,
} from './soporte/caja-chica-fondos.js';
import { EscenarioDeComprobantes, RUTA_DE_CAJA_CHICA, usuarioIdDe } from './soporte/caja-chica-comprobantes.js';
import {
  anularReposicion,
  conceptosEnBancos,
  documentoProcesado,
  reposicionEnBase,
} from './soporte/caja-chica-reposiciones.js';
import { arquear, ducientos } from './soporte/caja-chica-arqueos.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { saldoDe } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;
let cierra: ClienteApi;
let soloVe: ClienteApi;

const cerrar = (fondoId: string, cuerpo: Record<string, unknown> = {}, cliente: ClienteApi = e.propietario()) =>
  cliente.post(`${RUTA_DE_FONDOS}/${fondoId}/cerrar`, { motivo: 'Ya no se necesita', ...cuerpo });

async function documentoEnElFondo(fondoId: string, cambios: Record<string, unknown> = {}) {
  const { documentoId } = await e.registrarEnElLibro({ referenciaDeDestino: fondoId, ...cambios });
  const comprobante = (await e.delFondo(fondoId)).elementos.find((c: any) => c.documentoDeCompraId === documentoId);
  expect(comprobante, 'el documento debía quedar en el fondo').toBeDefined();
  return { documentoId, comprobanteId: comprobante.id as string };
}

async function darAcceso(nombres: string, ...fondoIds: string[]) {
  const id = await usuarioIdDe(e.caja.cuenta.empresaId, nombres);
  const respuesta = await e.propietario().put(`${RUTA_DE_ACCESOS}/${id}`, { fondoIds });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
}

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicacierra');
  const cuenta = e.caja.cuenta;
  cierra = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Cajero',
    apellidos: 'Cierra',
    permisos: ['caja-chica.fondos.ver', 'caja-chica.fondos.cerrar'],
  });
  soloVe = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Solo',
    apellidos: 'Cierra',
    permisos: ['caja-chica.fondos.ver'],
  });
});

describe('cerrar con lo pendiente y con efectivo', () => {
  it('liquida lo pendiente en una reposición compensada, deposita el resto y audita «cerrar» con el fondo como estaba', async () => {
    const fondo = await e.abrirFondo('Caja que cierra con pendiente', { monto: '5000.00' });
    const documento = await documentoEnElFondo(fondo.id);
    const vale = (await e.registrarVale(fondo.id)).cuerpo.comprobantes[0];
    const saldoAntes = await saldoDe(e.propietario(), e.caja.cuentaBancariaId);

    const respuesta = await cerrar(fondo.id, { referencia: 'BOL-77' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({
      estado: 'cerrado',
      motivoDeCierre: 'Ya no se necesita',
      pendienteDeReponer: '0.00',
      puedeAnularApertura: false,
    });
    expect(await fondoEnBase(fondo.id)).toMatchObject({ estado: 'cerrado', motivo_de_cierre: 'Ya no se necesita' });
    const [reposicion] = (await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}/reposiciones`)).cuerpo;
    expect(reposicion).toMatchObject({ forma: 'compensada_al_cerrar', monto: '1170.00', movimientoId: null });
    expect(await reposicionEnBase(reposicion.id)).toMatchObject({ estado: 'vigente', movimiento_id: null });
    expect(await documentoProcesado(documento.documentoId)).toBe(true);
    const cierre = (await cambiosEnBase(fondo.id)).at(-1)!;
    expect(cierre).toMatchObject({ tipo: 'cierre', forma: 'nota_de_credito', monto: '3830.00' });
    expect(await movimientoDeBancos(cierre.movimiento_id!)).toMatchObject({
      tipo: 'credito',
      modulo: 'caja-chica',
      origen: fondo.id,
    });
    expect(await conceptosEnBancos(cierre.movimiento_id!)).toEqual([
      { clave: 'devolucion_de_fondo_de_caja_chica', monto: '3830.00' },
    ]);
    expect(Number(await saldoDe(e.propietario(), e.caja.cuentaBancariaId)) - Number(saldoAntes)).toBeCloseTo(3830);
    const auditoria = await comoPropietario<{ accion: string; motivo: string | null; anterior: any }>(
      `select accion, motivo, anterior from core.auditoria where recurso = 'caja-chica.fondos' and registro_id = $1`,
      [fondo.id],
    );
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]).toMatchObject({ accion: 'cerrar', anterior: { estado: 'abierto', monto: '5000.00' } });
    expect(vale.id).toBeDefined();
  });

  it('sin pendiente no hay reposición y se deposita todo el fondo; la lista de cerrados lo trae', async () => {
    const fondo = await e.abrirFondo('Caja que cierra limpia', { monto: '800.00' });

    const respuesta = await cerrar(fondo.id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect((await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}/reposiciones`)).cuerpo).toEqual([]);
    expect((await cambiosEnBase(fondo.id)).at(-1)).toMatchObject({ tipo: 'cierre', monto: '800.00' });
    const cerrados = (await e.propietario().get(`${RUTA_DE_FONDOS}?estado=cerrado&limite=200`)).cuerpo;
    expect(cerrados.elementos.some((f: any) => f.id === fondo.id)).toBe(true);
  });

  it('si no queda efectivo no hay nota: el cierre queda «sin depósito» y no pide cuenta', async () => {
    const fondo = await e.abrirFondo('Caja gastada al cierre', { monto: '1120.00' });
    await documentoEnElFondo(fondo.id);
    await comoPropietario('update caja_chica.fondos set cuenta_bancaria_id = null where id = $1', [fondo.id]);

    const respuesta = await cerrar(fondo.id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect((await cambiosEnBase(fondo.id)).at(-1)).toMatchObject({
      tipo: 'cierre',
      forma: 'sin_deposito',
      monto: '0.00',
      movimiento_id: null,
    });
  });
});

describe('lo que se rechaza', () => {
  it('con un vale provisional abierto, con fecha futura o anterior a un comprobante, o sin cuenta del depósito', async () => {
    const conVale = await e.abrirFondo('Caja con vale al cerrar', { monto: '500.00' });
    await sembrarVale(conVale.id, e.caja.cuenta.empresaId, '50.00');
    const conFecha = await e.abrirFondo('Caja con fecha al cerrar', { monto: '3000.00' });
    await documentoEnElFondo(conFecha.id);
    const sinCuenta = await e.abrirFondo('Caja sin cuenta al cerrar', { monto: '500.00' });
    await comoPropietario('update caja_chica.fondos set cuenta_bancaria_id = null where id = $1', [sinCuenta.id]);

    const vales = await cerrar(conVale.id);
    const futura = await cerrar(conFecha.id, { fecha: '2999-01-01' });
    const antigua = await cerrar(conFecha.id, { fecha: '2026-01-01' });
    const sinDestino = await cerrar(sinCuenta.id);

    expect(vales.cuerpo.error.codigo).toBe('fondo_con_vales_abiertos');
    expect(futura.cuerpo.error.codigo).toBe('fecha_del_fondo_invalida');
    expect(antigua.cuerpo.error.codigo).toBe('fecha_anterior_a_la_apertura');
    expect(sinDestino.cuerpo.error.codigo).toBe('cuenta_del_deposito_obligatoria');
    for (const { id } of [conVale, conFecha, sinCuenta]) expect((await fondoEnBase(id)).estado).toBe('abierto');
    expect((await e.delFondo(conFecha.id)).totales.pendiente).toBe('1120.00');
    expect(await auditoriaDe(conVale.id)).toEqual([]);
  });

  it('el motivo es obligatorio, exige fondos.cerrar (403) y el fondo a la vista (404)', async () => {
    const fondo = await e.abrirFondo('Caja con permisos al cerrar', { monto: '500.00' });
    await darAcceso('Solo', fondo.id);

    const sinMotivo = await e.propietario().post(`${RUTA_DE_FONDOS}/${fondo.id}/cerrar`, { motivo: '  ' });
    const sinPermiso = await cerrar(fondo.id, {}, soloVe);
    const sinElFondo = await cerrar(fondo.id, {}, cierra);

    expect(sinMotivo.estado).toBe(400);
    expect(sinPermiso.estado).toBe(403);
    expect(sinElFondo.estado).toBe(404);
    expect((await fondoEnBase(fondo.id)).estado).toBe('abierto');
  });
});

describe('un fondo cerrado', () => {
  it('no se cierra otra vez, no se repone, y su compensada ni su depósito se anulan', async () => {
    const fondo = await e.abrirFondo('Caja cerrada y sellada', { monto: '2000.00' });
    const { comprobanteId } = await documentoEnElFondo(fondo.id);
    await cerrar(fondo.id);
    const [compensada] = (await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}/reposiciones`)).cuerpo;
    const deposito = (await cambiosEnBase(fondo.id)).at(-1)!;

    const otraVez = await cerrar(fondo.id);
    const aumento = await e.propietario().post(`${RUTA_DE_FONDOS}/${fondo.id}/aumentar`, {
      forma: 'cheque',
      chequeraId: e.caja.chequeraId,
      monto: '10.00',
    });
    const reposicion = await e.propietario().post(`${RUTA_DE_FONDOS}/${fondo.id}/reposiciones`, {
      comprobanteIds: [comprobanteId],
      forma: 'cheque',
      chequeraId: e.caja.chequeraId,
    });
    const anulaCompensada = await anularReposicion(compensada.id, e.propietario());
    const anulaDeposito = await e
      .propietario()
      .post(`/api/bancos/notas/${deposito.movimiento_id}/anular`, { motivo: 'Desde Bancos' });
    const anulaApertura = await e
      .propietario()
      .post(`${RUTA_DE_FONDOS}/${fondo.id}/anular-apertura`, { motivo: 'Tarde' });

    expect(otraVez.cuerpo.error.codigo).toBe('fondo_no_disponible');
    expect(aumento.cuerpo.error.codigo).toBe('fondo_no_disponible');
    expect(reposicion.cuerpo.error.codigo).toBe('fondo_no_disponible');
    expect(anulaCompensada.cuerpo.error.codigo).toBe('fondo_no_disponible');
    expect(anulaDeposito.cuerpo.error.codigo).toBe('movimiento_de_caja_chica');
    expect(anulaApertura.cuerpo.error.codigo).toBe('fondo_no_disponible');
    expect((await fondoEnBase(fondo.id)).estado).toBe('cerrado');
    expect((await cambiosEnBase(fondo.id)).at(-1)).toMatchObject({ tipo: 'cierre', estado: 'vigente' });
    expect(RUTA_DE_CAJA_CHICA).toBeDefined();
  });

  it('Bancos no anula el cheque de un aumento de un fondo cerrado (el depósito ya lo cuenta)', async () => {
    const fondo = await e.abrirFondo('Caja cerrada con aumento', { monto: '1000.00' });
    const aumento = await e.propietario().post(`${RUTA_DE_FONDOS}/${fondo.id}/aumentar`, {
      forma: 'cheque',
      chequeraId: e.caja.chequeraId,
      monto: '500.00',
    });
    expect(aumento.estado, JSON.stringify(aumento.cuerpo)).toBe(200);
    await cerrar(fondo.id);
    const [, delAumento] = await cambiosEnBase(fondo.id);
    const { cheque_id } = await movimientoDeBancos(delAumento!.movimiento_id!);

    const anula = await e.propietario().post(`/api/bancos/cheques/${cheque_id}/anular`, { motivo: 'Desde Bancos' });

    expect(anula.cuerpo.error.codigo).toBe('fondo_no_disponible');
    expect((await cambiosEnBase(fondo.id)).map((c) => c.estado)).toEqual(['vigente', 'vigente', 'vigente']);
  });

  it('lo pendiente que suma cero o menos queda en el fondo cerrado y el libro no lo anula ni lo elimina', async () => {
    const fondo = await e.abrirFondo('Caja cerrada con pendiente compensado', { monto: '5000.00' });
    const { documentoId } = await documentoEnElFondo(fondo.id);
    const conteo = [...ducientos(25), { denominacionCentavos: 2_000, cantidad: 4 }];
    const arqueo = await arquear(fondo.id, e.propietario(), { conteo, motivoDeDiferencia: 'Sobró dinero' });
    expect(arqueo.estado, JSON.stringify(arqueo.cuerpo)).toBe(201);
    expect((await cerrar(fondo.id)).estado).toBe(200);

    const anula = await e
      .propietario()
      .post(`/api/libro-de-compras/documentos/${documentoId}/anular`, { causa: 'error_de_captura', motivo: 'Tarde' });
    const elimina = await e.propietario().delete(`/api/libro-de-compras/documentos/${documentoId}`);

    expect(anula.cuerpo.error.codigo).toBe('fondo_no_disponible');
    expect(elimina.cuerpo.error.codigo).toBe('fondo_no_disponible');
    const ficha = (await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}`)).cuerpo;
    expect(ficha.pendienteDeReponer).toBe('0.00');
  });
});
