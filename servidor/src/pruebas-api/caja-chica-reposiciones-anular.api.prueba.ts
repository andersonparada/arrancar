/**
 * Anular una reposición (CC-4, §5.6 y §5.9): desde Caja chica (Bancos anula el cheque o la nota, los comprobantes vuelven a
 * pendientes, los documentos del libro a «sin procesar», auditoría `anular`), cuando el banco ya pagó el cheque, desde Bancos
 * (el aviso anula la reposición), y la baja de un documento repuesto en el libro. Además, la separación de funciones.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { movimientoDeBancos } from './soporte/caja-chica-fondos.js';
import { EscenarioDeComprobantes, usuarioIdDe } from './soporte/caja-chica-comprobantes.js';
import {
  anularReposicion,
  auditoriaDeLaReposicion,
  conciliarElMovimiento,
  documentoProcesado,
  lineasVigentesDe,
  PERMISOS_PARA_REPONER,
  reponer,
  reponerBien,
  reposicionEnBase,
} from './soporte/caja-chica-reposiciones.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';
import { saldoDe } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;
let anulador: ClienteApi;
let soloBancos: ClienteApi;

async function documentoEnElFondo(fondoId: string) {
  const { documentoId } = await e.registrarEnElLibro({ referenciaDeDestino: fondoId });
  const comprobante = (await e.delFondo(fondoId)).elementos.find((c: any) => c.documentoDeCompraId === documentoId);
  return { documentoId, comprobanteId: comprobante.id as string };
}

/** Un fondo con un documento repuesto con cheque. */
async function fondoRepuesto(nombre: string) {
  const fondo = await e.abrirFondo(nombre, { monto: '3000.00' });
  const documento = await documentoEnElFondo(fondo.id);
  const reposicion = await reponerBien(e, { fondoId: fondo.id, ids: [documento.comprobanteId] });
  return { fondo, documento, reposicion };
}

const pendienteDe = async (fondoId: string) => (await e.delFondo(fondoId)).totales.pendiente;
const chequeDe = async (movimientoId: string) => (await movimientoDeBancos(movimientoId)).cheque_id!;
const fijarVariable = async (clave: string, valor: unknown) => {
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: e.caja.cuenta.empresaId });
  const cambio = await entorno.soporte.put(`/api/configuracion/${clave}`, { nivel: 'empresa', valor });
  expect(cambio.estado, JSON.stringify(cambio.cuerpo)).toBe(204);
};

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicarepanula');
  const cuenta = e.caja.cuenta;
  anulador = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Anulador',
    apellidos: 'Repone',
    permisos: [...PERMISOS_PARA_REPONER, 'caja-chica.reposiciones.anular'],
  });
  soloBancos = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Solo',
    apellidos: 'Bancos',
    permisos: ['bancos.cheques.ver', 'bancos.cheques.anular', 'bancos.notas.ver', 'bancos.notas.anular'],
  });
});

describe('anular desde Caja chica', () => {
  it('Bancos anula el cheque, los comprobantes vuelven a pendientes y el documento a «sin procesar»; queda auditado «anular»', async () => {
    const saldoAntes = await saldoDe(e.propietario(), e.caja.cuentaBancariaId);
    const { fondo, documento, reposicion } = await fondoRepuesto('Caja que anula la reposición');
    const saldoRepuesto = await saldoDe(e.propietario(), e.caja.cuentaBancariaId);
    expect(await documentoProcesado(documento.documentoId)).toBe(true);

    const anulada = await anularReposicion(reposicion.id, e.propietario());

    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
    expect(anulada.cuerpo).toMatchObject({ estado: 'anulada', motivoDeAnulacion: 'Se repuso de más' });
    expect(await reposicionEnBase(reposicion.id)).toMatchObject({
      estado: 'anulada',
      motivo_de_anulacion: 'Se repuso de más',
    });
    expect((await reposicionEnBase(reposicion.id)).fecha_de_anulacion).not.toBeNull();
    expect(await lineasVigentesDe(reposicion.id)).toBe(0);
    expect(await pendienteDe(fondo.id)).toBe('1120.00');
    expect(await documentoProcesado(documento.documentoId)).toBe(false);
    expect(saldoRepuesto).not.toBe(saldoAntes);
    const [entrada, ...otras] = await auditoriaDeLaReposicion(reposicion.id);
    expect(otras).toEqual([]);
    expect(entrada).toMatchObject({ accion: 'anular', motivo: 'Se repuso de más' });
    expect(entrada!.anterior).toMatchObject({ numero: reposicion.numero, estado: 'vigente', monto: '1120.00' });
  });

  it('los comprobantes se pueden reponer otra vez y la nueva reposición lleva el número siguiente', async () => {
    const { fondo, documento, reposicion } = await fondoRepuesto('Caja que repone dos veces');
    await anularReposicion(reposicion.id, e.propietario());

    const segunda = await reponerBien(e, { fondoId: fondo.id, ids: [documento.comprobanteId] });

    expect(segunda.numero).toBe(reposicion.numero + 1);
    expect(await documentoProcesado(documento.documentoId)).toBe(true);
  });

  it('si el banco ya pagó el cheque no se anula: Bancos no cambia nada', async () => {
    const { fondo, reposicion } = await fondoRepuesto('Caja del cheque cobrado');
    await conciliarElMovimiento(reposicion.movimientoId);

    const rechazo = await anularReposicion(reposicion.id, e.propietario());

    expect(rechazo.estado).toBe(422);
    expect(rechazo.cuerpo.error.codigo).toBe('reposicion_cobrada');
    expect(rechazo.cuerpo.error.mensaje).toBe(`El banco ya pagó el cheque de la reposición ${reposicion.numero}.`);
    expect((await reposicionEnBase(reposicion.id)).estado).toBe('vigente');
    expect(await pendienteDe(fondo.id)).toBe('0.00');
    expect(await auditoriaDeLaReposicion(reposicion.id)).toEqual([]);
  });

  it('no se anula dos veces, exige reposiciones.anular (403) y el fondo a la vista (404)', async () => {
    const { reposicion } = await fondoRepuesto('Caja de los permisos de anular');
    const cajero = await crearUsuarioConPermisos(entorno, e.caja.cuenta, {
      nombres: 'Cajero',
      apellidos: 'Anula',
      permisos: PERMISOS_PARA_REPONER,
    });

    const sinPermiso = await anularReposicion(reposicion.id, cajero);
    const sinElFondo = await anularReposicion(reposicion.id, anulador);
    const sinMotivo = await anularReposicion(reposicion.id, e.propietario(), { motivo: ' ' });
    await anularReposicion(reposicion.id, e.propietario());
    const otraVez = await anularReposicion(reposicion.id, e.propietario());

    expect(sinPermiso.estado).toBe(403);
    expect(sinElFondo.estado).toBe(404);
    expect(sinMotivo.estado).toBe(400);
    expect(otraVez.estado).toBe(422);
    expect(otraVez.cuerpo.error.codigo).toBe('reposicion_ya_anulada');
  });

  it('si lo que vuelve a pendiente ya no cabe en el efectivo, no se anula', async () => {
    const fondo = await e.abrirFondo('Caja justa', { monto: '1200.00' });
    const primero = await documentoEnElFondo(fondo.id);
    const reposicion = await reponerBien(e, { fondoId: fondo.id, ids: [primero.comprobanteId] });
    await documentoEnElFondo(fondo.id);

    const rechazo = await anularReposicion(reposicion.id, e.propietario());

    expect(rechazo.cuerpo.error.codigo).toBe('comprobantes_mayores_que_el_efectivo');
    expect((await reposicionEnBase(reposicion.id)).estado).toBe('vigente');
  });
});

describe('anular desde Bancos (aviso)', () => {
  it('al anular el cheque en Bancos se anula la reposición con ese motivo y el documento vuelve a «sin procesar»', async () => {
    const { fondo, documento, reposicion } = await fondoRepuesto('Caja anulada en Bancos');

    const anulado = await e
      .propietario()
      .post(`/api/bancos/cheques/${await chequeDe(reposicion.movimientoId)}/anular`, { motivo: 'Desde Bancos' });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(await reposicionEnBase(reposicion.id)).toMatchObject({ estado: 'anulada' });
    expect((await reposicionEnBase(reposicion.id)).motivo_de_anulacion).toContain('Desde Bancos');
    expect(await pendienteDe(fondo.id)).toBe('1120.00');
    expect(await documentoProcesado(documento.documentoId)).toBe(false);
    expect((await auditoriaDeLaReposicion(reposicion.id)).map((a) => a.accion)).toEqual(['anular']);
  });

  it('el cheque de una reposición de un fondo que el usuario de Bancos no tiene no se anula desde Bancos', async () => {
    const { reposicion } = await fondoRepuesto('Caja ajena a Bancos');

    const anulado = await soloBancos.post(`/api/bancos/cheques/${await chequeDe(reposicion.movimientoId)}/anular`, {
      motivo: 'Desde Bancos',
    });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(422);
    expect(anulado.cuerpo.error.codigo).toBe('movimiento_de_caja_chica');
    expect((await reposicionEnBase(reposicion.id)).estado).toBe('vigente');
  });

  it('la nota de una reposición se anula desde Bancos igual, pero no se elimina', async () => {
    const fondo = await e.abrirFondo('Caja de la nota anulada', { monto: '3000.00' });
    const documento = await documentoEnElFondo(fondo.id);
    const reposicion = await reponerBien(e, {
      fondoId: fondo.id,
      ids: [documento.comprobanteId],
      cambios: { forma: 'nota_de_debito', cuentaBancariaId: e.caja.cuentaBancariaId },
    });

    const eliminada = await e.propietario().delete(`/api/bancos/notas/${reposicion.movimientoId}`);
    const anulada = await e
      .propietario()
      .post(`/api/bancos/notas/${reposicion.movimientoId}/anular`, { motivo: 'Desde Bancos' });

    expect(eliminada.estado).toBeGreaterThanOrEqual(400);
    expect((await reposicionEnBase(reposicion.id)).estado).toBe('anulada');
    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
  });

  it('un cheque cobrado no se anula desde Bancos y la reposición sigue vigente', async () => {
    const { reposicion } = await fondoRepuesto('Caja cobrada en Bancos');
    await conciliarElMovimiento(reposicion.movimientoId);

    const anulado = await e
      .propietario()
      .post(`/api/bancos/cheques/${await chequeDe(reposicion.movimientoId)}/anular`, { motivo: 'Desde Bancos' });

    expect(anulado.estado).toBeGreaterThanOrEqual(400);
    expect((await reposicionEnBase(reposicion.id)).estado).toBe('vigente');
  });
});

describe('el documento de una reposición en el libro de compras', () => {
  it('mientras está repuesto el libro no lo anula; con la reposición anulada, sí', async () => {
    const { documento, reposicion } = await fondoRepuesto('Caja del libro y la reposición');
    const anularEnElLibro = () =>
      e.propietario().post(`${RUTA_DOCUMENTOS}/${documento.documentoId}/anular`, {
        causa: 'error_de_captura',
        motivo: 'Mal capturado',
      });

    const rechazo = await anularEnElLibro();
    await anularReposicion(reposicion.id, e.propietario());
    const anulado = await anularEnElLibro();

    expect(rechazo.cuerpo.error.codigo).toBe('comprobante_repuesto');
    expect(rechazo.cuerpo.error.mensaje).toBe(`Está en la reposición ${reposicion.numero}: anúlela primero.`);
    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
  });
});

describe('la separación de funciones', () => {
  async function fondoConCustodio(nombre: string) {
    const usuario = await crearUsuarioConPermisos(entorno, e.caja.cuenta, {
      nombres: nombre,
      apellidos: 'Custodio',
      permisos: PERMISOS_PARA_REPONER,
    });
    const usuarioId = await usuarioIdDe(e.caja.cuenta.empresaId, nombre);
    const fondo = await e.abrirFondo(`Caja de ${nombre}`, {
      monto: '3000.00',
      custodio: null,
      custodioUsuarioId: usuarioId,
    });
    const documento = await documentoEnElFondo(fondo.id);
    return { usuario, fondo, documento };
  }

  it('con «avisar» el custodio repone y recibe el aviso; queda marcado en la reposición', async () => {
    const { usuario, fondo, documento } = await fondoConCustodio('Avisado');

    const respuesta = await reponer(e, { fondoId: fondo.id, ids: [documento.comprobanteId], cliente: usuario });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.laHizoElCustodio).toBe(true);
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('custodio de este fondo');
    expect((await reposicionEnBase(respuesta.cuerpo.id)).la_hizo_el_custodio).toBe(true);
  });

  it('con «bloquear» el custodio no repone, pero otra persona sí, sin aviso', async () => {
    const { usuario, fondo, documento } = await fondoConCustodio('Bloqueado');
    await fijarVariable('caja-chica.control.separacion_de_funciones', 'bloquear');

    const bloqueado = await reponer(e, { fondoId: fondo.id, ids: [documento.comprobanteId], cliente: usuario });
    const otraPersona = await reponer(e, { fondoId: fondo.id, ids: [documento.comprobanteId] });

    expect(bloqueado.estado).toBe(422);
    expect(bloqueado.cuerpo.error.codigo).toBe('separacion_de_funciones');
    expect(await comoPropietario('select 1 from caja_chica.reposiciones where fondo_id = $1', [fondo.id])).toHaveLength(
      1,
    );
    expect(otraPersona.estado, JSON.stringify(otraPersona.cuerpo)).toBe(201);
    expect(otraPersona.cuerpo.laHizoElCustodio).toBe(false);
    await fijarVariable('caja-chica.control.separacion_de_funciones', 'avisar');
  });
});
