/**
 * Reponer un fondo de Caja chica (CC-4, §5.6): los comprobantes escogidos pasan a «repuestos», Bancos recibe el cheque o la
 * nota con el reparto por concepto (operación, activo fijo), los documentos del libro quedan procesados, y todo lo que se
 * rechaza (comprobante repuesto o ajeno, total en cero, fecha, cheque al portador, permisos, alcance por fondo).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { RUTA_DE_ACCESOS, RUTA_DE_FONDOS, movimientoDeBancos } from './soporte/caja-chica-fondos.js';
import { EscenarioDeComprobantes, RUTA_DE_CAJA_CHICA, usuarioIdDe } from './soporte/caja-chica-comprobantes.js';
import {
  conceptosEnBancos,
  documentoProcesado,
  lineasVigentesDe,
  PERMISOS_PARA_REPONER,
  reponer,
  reponerBien,
  reposicionEnBase,
} from './soporte/caja-chica-reposiciones.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;
let cajero: ClienteApi;
let soloVe: ClienteApi;

/** Un documento del libro asignado al fondo: su id de documento y el de su comprobante. */
async function documentoEnElFondo(fondoId: string, cambios: Record<string, unknown> = {}) {
  const { documentoId } = await e.registrarEnElLibro({ referenciaDeDestino: fondoId, ...cambios });
  const comprobante = (await e.delFondo(fondoId)).elementos.find((c: any) => c.documentoDeCompraId === documentoId);
  expect(comprobante, 'el documento debía quedar en el fondo').toBeDefined();
  return { documentoId, comprobanteId: comprobante.id as string };
}

const pendienteDe = async (fondoId: string) => (await e.delFondo(fondoId)).totales.pendiente;

async function darAcceso(nombres: string, ...fondoIds: string[]) {
  const id = await usuarioIdDe(e.caja.cuenta.empresaId, nombres);
  const respuesta = await e.propietario().put(`${RUTA_DE_ACCESOS}/${id}`, { fondoIds });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
}

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicarepone');
  const cuenta = e.caja.cuenta;
  cajero = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Cajero',
    apellidos: 'Repone',
    permisos: PERMISOS_PARA_REPONER,
  });
  soloVe = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Solo',
    apellidos: 'Repone',
    permisos: ['caja-chica.fondos.ver'],
  });
});

describe('reponer con un cheque', () => {
  it('guarda la reposición, pide el cheque a Bancos con el concepto, procesa el documento y deja los comprobantes repuestos', async () => {
    const fondo = await e.abrirFondo('Caja que repone con cheque', { monto: '5000.00' });
    const primero = await documentoEnElFondo(fondo.id);
    const segundo = await documentoEnElFondo(fondo.id);
    const vale = (await e.registrarVale(fondo.id)).cuerpo.comprobantes[0];
    expect(await pendienteDe(fondo.id)).toBe('2290.00');

    const respuesta = await reponer(e, {
      fondoId: fondo.id,
      ids: [primero.comprobanteId, segundo.comprobanteId, vale.id],
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    const reposicion = respuesta.cuerpo;
    expect(reposicion).toMatchObject({
      forma: 'cheque',
      monto: '2290.00',
      estado: 'vigente',
      custodio: 'Juan Pérez',
      laHizoElCustodio: false,
      desglose: { operacion: '2290.00', activo: '0.00', faltante: '0.00' },
    });
    expect(reposicion.lineas).toHaveLength(3);
    expect(await reposicionEnBase(reposicion.id)).toMatchObject({
      numero: reposicion.numero,
      estado: 'vigente',
      monto: '2290.00',
    });
    const cheque = await movimientoDeBancos(reposicion.movimientoId);
    expect(cheque).toMatchObject({
      tipo: 'cheque',
      modulo: 'caja-chica',
      origen: reposicion.id,
      beneficiario: 'Juan Pérez',
      no_negociable: true,
    });
    expect(await conceptosEnBancos(reposicion.movimientoId)).toEqual([
      { clave: 'reintegro_de_caja_chica', monto: '2290.00' },
    ]);
    expect(await documentoProcesado(primero.documentoId)).toBe(true);
    expect(await documentoProcesado(segundo.documentoId)).toBe(true);
    expect(await pendienteDe(fondo.id)).toBe('0.00');
    expect((await e.delFondo(fondo.id, 'repuesto')).elementos).toHaveLength(3);
    expect((await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}`)).cuerpo).toMatchObject({
      efectivoEsperado: '5000.00',
      pendienteDeReponer: '0.00',
    });
  });

  it('con una nota de débito reparte lo de activo fijo aparte y las notas de crédito restan', async () => {
    const fondo = await e.abrirFondo('Caja que repone con nota', { monto: '5000.00' });
    const factura = await documentoEnElFondo(fondo.id);
    const nota = await documentoEnElFondo(fondo.id, {
      tipoDte: 'NCRE',
      serie: 'N',
      documentoAfectadoId: factura.documentoId,
      total: '560.00',
    });
    const activo = await documentoEnElFondo(fondo.id, { total: '2000.00' });
    await comoPropietario('update caja_chica.comprobantes set con_activo_fijo = true where id = $1', [
      activo.comprobanteId,
    ]);

    const reposicion = await reponerBien(e, {
      fondoId: fondo.id,
      ids: [factura.comprobanteId, nota.comprobanteId, activo.comprobanteId],
      cambios: {
        forma: 'nota_de_debito',
        chequeraId: undefined,
        cuentaBancariaId: e.caja.cuentaBancariaId,
        referencia: 'BOL-9',
      },
    });

    expect(reposicion).toMatchObject({
      forma: 'nota_de_debito',
      monto: '2560.00',
      desglose: { operacion: '560.00', activo: '2000.00', faltante: '0.00' },
    });
    expect(reposicion.lineas.map((l: any) => l.monto).sort()).toEqual(['-560.00', '1120.00', '2000.00']);
    expect(await movimientoDeBancos(reposicion.movimientoId)).toMatchObject({ tipo: 'debito', modulo: 'caja-chica' });
    expect(await conceptosEnBancos(reposicion.movimientoId)).toEqual([
      { clave: 'reintegro_de_caja_chica', monto: '560.00' },
      { clave: 'reintegro_de_caja_chica_de_activo', monto: '2000.00' },
    ]);
  });

  it('el cheque puede ir a nombre de otro, pero nunca al portador', async () => {
    const fondo = await e.abrirFondo('Caja del beneficiario', { monto: '3000.00' });
    const { comprobanteId } = await documentoEnElFondo(fondo.id);

    const alPortador = await reponer(e, {
      fondoId: fondo.id,
      ids: [comprobanteId],
      cambios: { beneficiario: 'Al portador' },
    });
    const aOtro = await reponerBien(e, {
      fondoId: fondo.id,
      ids: [comprobanteId],
      cambios: { beneficiario: 'Ana López' },
    });

    expect(alPortador.estado).toBe(400);
    expect(alPortador.cuerpo.error.codigo).toBe('beneficiario_invalido');
    expect((await movimientoDeBancos(aOtro.movimientoId)).beneficiario).toBe('Ana López');
  });
});

describe('lo que se rechaza', () => {
  it('un comprobante ya repuesto, uno de otro fondo y uno que no existe; nada queda guardado', async () => {
    const fondo = await e.abrirFondo('Caja de los rechazos', { monto: '3000.00' });
    const otro = await e.abrirFondo('Caja de los rechazos 2', { monto: '3000.00' });
    const repuesto = await documentoEnElFondo(fondo.id);
    const ajeno = await documentoEnElFondo(otro.id);
    const primera = await reponerBien(e, { fondoId: fondo.id, ids: [repuesto.comprobanteId] });

    const yaRepuesto = await reponer(e, { fondoId: fondo.id, ids: [repuesto.comprobanteId] });
    const deOtroFondo = await reponer(e, { fondoId: fondo.id, ids: [ajeno.comprobanteId] });
    const inexistente = await reponer(e, { fondoId: fondo.id, ids: [crypto.randomUUID()] });

    expect(yaRepuesto.cuerpo.error).toMatchObject({ codigo: 'comprobante_repuesto' });
    expect(yaRepuesto.cuerpo.error.mensaje).toBe(`Está en la reposición ${primera.numero}: anúlela primero.`);
    expect(deOtroFondo.cuerpo.error.codigo).toBe('comprobante_no_es_del_fondo');
    expect(inexistente.cuerpo.error.codigo).toBe('comprobante_no_es_del_fondo');
    expect(await pendienteDe(otro.id)).toBe('1120.00');
    expect(await documentoProcesado(ajeno.documentoId)).toBe(false);
  });

  it('un total que no pasa de cero, una fecha futura o anterior a un comprobante y una lista vacía', async () => {
    const fondo = await e.abrirFondo('Caja de las fechas', { monto: '3000.00' });
    const factura = await documentoEnElFondo(fondo.id);
    const nota = await documentoEnElFondo(fondo.id, {
      tipoDte: 'NCRE',
      serie: 'N',
      documentoAfectadoId: factura.documentoId,
      total: '560.00',
    });

    const sinMonto = await reponer(e, { fondoId: fondo.id, ids: [nota.comprobanteId] });
    const futura = await reponer(e, {
      fondoId: fondo.id,
      ids: [factura.comprobanteId],
      cambios: { fecha: '2999-01-01' },
    });
    const antigua = await reponer(e, {
      fondoId: fondo.id,
      ids: [factura.comprobanteId],
      cambios: { fecha: '2000-01-01' },
    });
    const vacia = await reponer(e, { fondoId: fondo.id, ids: [] });

    expect(sinMonto.cuerpo.error.codigo).toBe('reposicion_sin_monto');
    expect(futura.cuerpo.error.codigo).toBe('fecha_de_la_reposicion_invalida');
    expect(antigua.cuerpo.error.codigo).toBe('fecha_de_la_reposicion_invalida');
    expect(vacia.estado).toBe(400);
    expect(await pendienteDe(fondo.id)).toBe('560.00');
  });

  it('un fondo cerrado no se repone', async () => {
    const fondo = await e.abrirFondo('Caja que cierra', { monto: '2000.00' });
    const { comprobanteId } = await documentoEnElFondo(fondo.id);
    await comoPropietario(
      `update caja_chica.fondos set estado = 'cerrado', fecha_de_cierre = current_date, cerrado_en = now(), cerrado_por = $2, motivo_de_cierre = 'x' where id = $1`,
      [fondo.id, await e.propietarioId()],
    );

    const rechazo = await reponer(e, { fondoId: fondo.id, ids: [comprobanteId] });

    expect(rechazo.cuerpo.error.codigo).toBe('fondo_no_disponible');
  });

  it('exige reposiciones.crear (403) y el fondo a la vista (404)', async () => {
    const fondo = await e.abrirFondo('Caja con alcance', { monto: '3000.00' });
    const { comprobanteId } = await documentoEnElFondo(fondo.id);
    await darAcceso('Solo', fondo.id);

    const sinPermiso = await reponer(e, { fondoId: fondo.id, ids: [comprobanteId], cliente: soloVe });
    const sinElFondo = await reponer(e, { fondoId: fondo.id, ids: [comprobanteId], cliente: cajero });

    expect(sinPermiso.estado).toBe(403);
    expect(sinElFondo.estado).toBe(404);
    expect(await pendienteDe(fondo.id)).toBe('1120.00');
  });
});

describe('lista, ficha y solicitud', () => {
  it('la solicitud trae lo pendiente con su reparto; después de reponer, la lista y la ficha traen la reposición con sus líneas', async () => {
    const fondo = await e.abrirFondo('Caja de las consultas', { monto: '3000.00' });
    const primero = await documentoEnElFondo(fondo.id);
    await darAcceso('Solo', fondo.id);
    await darAcceso('Cajero', fondo.id);

    const solicitud = (await soloVe.get(`${RUTA_DE_FONDOS}/${fondo.id}/solicitud-de-reposicion`)).cuerpo;
    const reposicion = await reponerBien(e, { fondoId: fondo.id, ids: [primero.comprobanteId], cliente: cajero });
    const lista = await soloVe.get(`${RUTA_DE_FONDOS}/${fondo.id}/reposiciones`);
    const ficha = await soloVe.get(`${RUTA_DE_CAJA_CHICA}/reposiciones/${reposicion.id}`);

    expect(solicitud).toMatchObject({ fondoNombre: 'Caja de las consultas', custodio: 'Juan Pérez', total: '1120.00' });
    expect(solicitud.pendientes).toHaveLength(1);
    expect(solicitud.desglose).toEqual({ operacion: '1120.00', activo: '0.00', faltante: '0.00' });
    expect(lista.cuerpo).toMatchObject([
      { id: reposicion.id, numero: reposicion.numero, monto: '1120.00', estado: 'vigente' },
    ]);
    expect(lista.cuerpo[0]).not.toHaveProperty('lineas');
    expect(ficha.cuerpo.lineas).toMatchObject([
      { monto: '1120.00', comprobante: { id: primero.comprobanteId, reposicionNumero: reposicion.numero } },
    ]);
    expect(await lineasVigentesDe(reposicion.id)).toBe(1);
  });

  it('un usuario que no tiene el fondo no ve ni su lista ni su reposición (404) y quien no tiene fondos.ver recibe 403', async () => {
    const fondo = await e.abrirFondo('Caja oculta', { monto: '3000.00' });
    const { comprobanteId } = await documentoEnElFondo(fondo.id);
    const reposicion = await reponerBien(e, { fondoId: fondo.id, ids: [comprobanteId] });
    const sinPermisos = await crearUsuarioConPermisos(entorno, e.caja.cuenta, {
      nombres: 'Sin',
      apellidos: 'Reposiciones',
      permisos: ['bancos.cuentas-bancarias.ver'],
    });

    expect((await cajero.get(`${RUTA_DE_FONDOS}/${fondo.id}/reposiciones`)).estado).toBe(404);
    expect((await cajero.get(`${RUTA_DE_FONDOS}/${fondo.id}/solicitud-de-reposicion`)).estado).toBe(404);
    expect((await cajero.get(`${RUTA_DE_CAJA_CHICA}/reposiciones/${reposicion.id}`)).estado).toBe(404);
    expect((await sinPermisos.get(`${RUTA_DE_CAJA_CHICA}/reposiciones/${reposicion.id}`)).estado).toBe(403);
    expect((await e.propietario().get(`${RUTA_DE_CAJA_CHICA}/reposiciones/${crypto.randomUUID()}`)).estado).toBe(404);
  });
});
