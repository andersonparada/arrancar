/**
 * Qué se hace con un documento que su emisor anuló después de gastar (dictamen del 2026-11-24): resolverlo con
 * devolución, cobro o sin recuperación, llevar la disputa de la anulación y reemplazarlo por otra FEL sin tocar la
 * reposición, el monto ni el efectivo.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { AyudasDeDocumentoAnulado, filaDel } from './soporte/caja-chica-documento-anulado.js';
import { EscenarioDeComprobantes, RUTA_DE_CAJA_CHICA } from './soporte/caja-chica-comprobantes.js';
import { RUTA_DE_FONDOS } from './soporte/caja-chica-fondos.js';
import {
  conciliarElMovimiento,
  documentoProcesado,
  reponerBien,
  reposicionEnBase,
} from './soporte/caja-chica-reposiciones.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;
let a: AyudasDeDocumentoAnulado;
let cierraSinExcepcion: ClienteApi;
let sinPermiso: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicadocresolver');
  a = new AyudasDeDocumentoAnulado(e);
  const cuenta = e.caja.cuenta;
  cierraSinExcepcion = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Cierra',
    apellidos: 'Simple',
    permisos: ['caja-chica.fondos.ver', 'caja-chica.fondos.ver-todos', 'caja-chica.fondos.cerrar'],
  });
  sinPermiso = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Mira',
    apellidos: 'Nomas',
    permisos: ['caja-chica.fondos.ver', 'caja-chica.fondos.ver-todos'],
  });
});

describe('resolver con devolución, cobro o sin recuperación', () => {
  it('sin recuperación deja el gasto no deducible, resuelto y auditado `ajustar`; no se resuelve dos veces', async () => {
    const { fondo, comprobanteId } = await a.conFelAnulada('Caja sin recuperación');

    const respuesta = await a.accion(comprobanteId, 'resolver', {
      salida: 'sin_recuperacion',
      motivo: 'El proveedor cerró',
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.seguimiento).toMatchObject({
      situacion: 'resuelto',
      salida: 'sin_recuperacion',
      motivoDeLaResolucion: 'El proveedor cerró',
      monto: null,
    });
    expect(await a.ficha(fondo.id)).toMatchObject({ documentosPorResolver: 0, pendienteDeReponer: '300.00' });
    const pendientes = filaDel(await a.verReporte(`pendientes-de-reponer?fondoId=${fondo.id}`), fondo.id);
    expect(pendientes).toMatchObject({ deducible: '0.00', noDeducible: '300.00' });
    expect((await a.auditoriaDelComprobante(comprobanteId)).map(({ accion: a }) => a)).toEqual(['corregir', 'ajustar']);
    const repetida = await a.accion(comprobanteId, 'resolver', { salida: 'sin_recuperacion', motivo: 'Otra vez' });
    expect(repetida.estado).toBe(422);
    expect(repetida.cuerpo.error.codigo).toBe('situacion_del_documento_no_permite');
  });

  it('la devolución y el cobro piden monto y destino, y el monto no pasa de lo gastado', async () => {
    const { comprobanteId } = await a.conFelAnulada('Caja con devolución');

    const sinMonto = await a.accion(comprobanteId, 'resolver', { salida: 'devolucion', motivo: 'Devolvió' });
    const demasiado = await a.accion(comprobanteId, 'resolver', {
      salida: 'cobro',
      motivo: 'Se cobra',
      monto: '300.01',
      destino: 'proveedor',
    });
    const bien = await a.accion(comprobanteId, 'resolver', {
      salida: 'devolucion',
      motivo: 'El proveedor devolvió parte',
      monto: '100.00',
      destino: 'proveedor',
    });

    expect(sinMonto.estado).toBe(400);
    expect(sinMonto.cuerpo.error.codigo).toBe('salida_del_documento_invalida');
    expect(demasiado.cuerpo.error.codigo).toBe('monto_de_la_salida_excedido');
    expect(bien.estado, JSON.stringify(bien.cuerpo)).toBe(200);
    expect(bien.cuerpo.seguimiento).toMatchObject({ salida: 'devolucion', monto: '100.00', destino: 'proveedor' });
  });

  it('sin recuperación no lleva monto ni destino', async () => {
    const { comprobanteId } = await a.conFelAnulada('Caja sin recuperación con monto');

    const respuesta = await a.accion(comprobanteId, 'resolver', {
      salida: 'sin_recuperacion',
      motivo: 'Se pierde',
      monto: '10.00',
      destino: 'custodio',
    });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('salida_del_documento_invalida');
  });

  it('un comprobante vigente que no tiene documento anulado no se resuelve', async () => {
    const { comprobanteId } = await a.fondoConFactura('Caja con factura vigente');

    const respuesta = await a.accion(comprobanteId, 'resolver', { salida: 'sin_recuperacion', motivo: 'No aplica' });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('comprobante_sin_documento_anulado');
  });

  it('pide su propio permiso', async () => {
    const { comprobanteId } = await a.conFelAnulada('Caja sin permiso de resolver');

    const respuesta = await sinPermiso.post(
      `${RUTA_DE_CAJA_CHICA}/comprobantes/${comprobanteId}/documento-anulado/resolver`,
      { salida: 'sin_recuperacion', motivo: 'x' },
    );

    expect(respuesta.estado).toBe(403);
  });
});

describe('la anulación en disputa', () => {
  it('pasa a disputa con motivo y prueba de pago, con su fecha límite, y se retira o se resuelve', async () => {
    const { fondo, comprobanteId } = await a.conFelAnulada('Caja con disputa');

    const disputa = await a.accion(comprobanteId, 'disputa', {
      motivo: 'Sí pagamos esa compra',
      prueba: 'Cheque 1234',
    });

    expect(disputa.estado, JSON.stringify(disputa.cuerpo)).toBe(200);
    expect(disputa.cuerpo.seguimiento.situacion).toBe('en_disputa');
    expect(disputa.cuerpo.seguimiento.disputa).toMatchObject({
      motivo: 'Sí pagamos esa compra',
      prueba: 'Cheque 1234',
    });
    expect(disputa.cuerpo.seguimiento.disputa.hasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(disputa.cuerpo.seguimiento.disputa.hasta > disputa.cuerpo.documento.fechaEmision).toBe(true);
    expect(await a.ficha(fondo.id)).toMatchObject({ documentosPorResolver: 1 });
    const otra = await a.accion(comprobanteId, 'disputa', { motivo: 'Otra vez', prueba: 'Cheque 1234' });
    expect(otra.cuerpo.error.codigo).toBe('situacion_del_documento_no_permite');
    const retirada = await a.accion(comprobanteId, 'retirar-disputa', { motivo: 'La SAT confirmó la anulación' });
    expect(retirada.cuerpo.seguimiento).toMatchObject({ situacion: 'por_resolver', disputa: null });
    expect((await a.accion(comprobanteId, 'retirar-disputa', { motivo: 'x' })).estado).toBe(422);
  });

  it('en disputa también bloquea el cierre y se resuelve con una salida; la disputa pide la prueba', async () => {
    const { fondo, comprobanteId } = await a.conFelAnulada('Caja con disputa que se resuelve');
    const sinPrueba = await a.accion(comprobanteId, 'disputa', { motivo: 'Sí pagamos' });
    await a.accion(comprobanteId, 'disputa', { motivo: 'Sí pagamos', prueba: 'Voucher 77' });

    const cierre = await cierraSinExcepcion.post(`${RUTA_DE_FONDOS}/${fondo.id}/cerrar`, { motivo: 'x' });
    const resuelta = await a.accion(comprobanteId, 'resolver', { salida: 'sin_recuperacion', motivo: 'No prosperó' });

    expect(sinPrueba.estado).toBe(400);
    expect(cierre.cuerpo.error.codigo).toBe('fondo_con_documentos_por_resolver');
    expect(resuelta.cuerpo.seguimiento).toMatchObject({ situacion: 'resuelto', disputa: null });
  });
});

describe('con la reposición cobrada o el fondo cerrado', () => {
  it('con el cheque ya conciliado, la reposición y su cheque siguen igual y se resuelve igual', async () => {
    const { fondo, documentoId, comprobanteId } = await a.fondoConFactura(
      'Caja con el cheque cobrado y la FEL anulada',
    );
    const reposicion = await reponerBien(e, { fondoId: fondo.id, ids: [comprobanteId] });
    await conciliarElMovimiento(reposicion.movimientoId);

    const anulada = await a.anularLaFel(documentoId);
    const resuelta = await a.accion(comprobanteId, 'resolver', {
      salida: 'sin_recuperacion',
      motivo: 'No se recupera',
    });

    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
    expect(resuelta.estado, JSON.stringify(resuelta.cuerpo)).toBe(200);
    expect(await reposicionEnBase(reposicion.id)).toMatchObject({ estado: 'vigente' });
    expect(await a.ficha(fondo.id)).toMatchObject({ pendienteDeReponer: '0.00', documentosPorResolver: 0 });
  });

  it('con el fondo ya cerrado no se reabre ni se toca la reposición compensada: el documento queda por resolver y se resuelve', async () => {
    const { fondo, documentoId, comprobanteId } = await a.fondoConFactura('Caja cerrada con la FEL anulada después');
    const cierre = await e.propietario().post(`${RUTA_DE_FONDOS}/${fondo.id}/cerrar`, { motivo: 'Ya no se necesita' });
    expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);

    const anulada = await a.anularLaFel(documentoId);

    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
    const [fila] = await comoPropietario<{ estado: string; situacion_del_documento: string }>(
      'select estado, situacion_del_documento from caja_chica.comprobantes where id = $1',
      [comprobanteId],
    );
    expect(fila).toEqual({ estado: 'vigente', situacion_del_documento: 'por_resolver' });
    const resuelta = await a.accion(comprobanteId, 'resolver', {
      salida: 'sin_recuperacion',
      motivo: 'No se recupera',
    });
    expect(resuelta.estado, JSON.stringify(resuelta.cuerpo)).toBe(200);
    expect(await a.ficha(fondo.id)).toMatchObject({ estado: 'cerrado', documentosPorResolver: 0 });
  });
});

describe('reemplazar el documento anulado por otra FEL', () => {
  it('con la factura ya repuesta: la reposición y el monto no cambian, el comprobante apunta a la FEL nueva y es deducible', async () => {
    const { fondo, documentoId, comprobanteId } = await a.fondoConFactura('Caja con reemplazo de una factura repuesta');
    const reposicion = await reponerBien(e, { fondoId: fondo.id, ids: [comprobanteId] });
    await a.anularLaFel(documentoId);
    const { documentoId: nuevoId } = await e.registrarEnElLibro({ total: '300.00' });
    const nuevoEnLaBandeja = await e.enLaBandeja(nuevoId);

    const respuesta = await a.accion(comprobanteId, 'reemplazar', {
      reemplazoId: nuevoEnLaBandeja.id,
      motivo: 'El proveedor emitió la factura de nuevo',
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ documentoDeCompraId: nuevoId, monto: '300.00' });
    expect(respuesta.cuerpo.seguimiento).toMatchObject({
      situacion: 'resuelto',
      salida: 'reemplazo',
      documentoAnuladoId: documentoId,
    });
    expect(respuesta.cuerpo.documento.enElLibro).toBe(true);
    expect(await e.enLaBandeja(nuevoId)).toBeUndefined();
    expect(await reposicionEnBase(reposicion.id)).toMatchObject({ estado: 'vigente' });
    expect(await documentoProcesado(nuevoId)).toBe(true);
    expect(await a.ficha(fondo.id)).toMatchObject({ pendienteDeReponer: '0.00', documentosPorResolver: 0 });
    const auditoriaDelNuevo = await a.auditoriaDelComprobante(nuevoEnLaBandeja.id);
    expect(auditoriaDelNuevo.map(({ accion: a }) => a)).toEqual(['eliminar']);
    expect((await a.auditoriaDelComprobante(comprobanteId)).map(({ accion: a }) => a)).toEqual([
      'corregir',
      'corregir',
    ]);
  });

  it('el monto y el proveedor deben ser los mismos, y el documento debe estar en la bandeja', async () => {
    const { fondo, comprobanteId } = await a.conFelAnulada('Caja con reemplazos que no sirven');
    const { documentoId: otroMonto } = await e.registrarEnElLibro({ total: '250.00' });
    const { documentoId: enOtroFondo } = await e.registrarEnElLibro({ referenciaDeDestino: fondo.id, total: '300.00' });
    const delOtroMonto = await e.enLaBandeja(otroMonto);
    const delFondo = (await e.delFondo(fondo.id)).elementos.find((c: any) => c.documentoDeCompraId === enOtroFondo);

    const monto = await a.accion(comprobanteId, 'reemplazar', { reemplazoId: delOtroMonto.id, motivo: 'x' });
    const yaAsignado = await a.accion(comprobanteId, 'reemplazar', { reemplazoId: delFondo.id, motivo: 'x' });
    const mismo = await a.accion(comprobanteId, 'reemplazar', { reemplazoId: comprobanteId, motivo: 'x' });

    for (const respuesta of [monto, yaAsignado, mismo]) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('reemplazo_no_valido');
    }
  });

  it('si la FEL nueva también se anula, el comprobante vuelve a quedar por resolver', async () => {
    const { comprobanteId } = await a.conFelAnulada('Caja con el reemplazo anulado de nuevo');
    const { documentoId: nuevoId } = await e.registrarEnElLibro({ total: '300.00' });
    const nuevo = await e.enLaBandeja(nuevoId);
    expect((await a.accion(comprobanteId, 'reemplazar', { reemplazoId: nuevo.id, motivo: 'Nueva FEL' })).estado).toBe(
      200,
    );

    const anulada = await a.anularLaFel(nuevoId);

    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
    const lista = await comoPropietario<{ situacion_del_documento: string; salida_del_documento: string | null }>(
      'select situacion_del_documento, salida_del_documento from caja_chica.comprobantes where id = $1',
      [comprobanteId],
    );
    expect(lista[0]).toEqual({ situacion_del_documento: 'por_resolver', salida_del_documento: null });
  });
});
