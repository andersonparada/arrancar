/**
 * El tope por comprobante (CC-i), devolver un documento a la bandeja (§5.4 c) y los avisos del libro cuando anula o elimina
 * un documento que está en Caja chica (§5.9): un comprobante repuesto lo impide y el libro no cambia nada.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { RUTA_DE_ACCESOS, RUTA_DE_FONDOS } from './soporte/caja-chica-fondos.js';
import {
  auditoriaDelComprobante,
  comprobanteEnBase,
  existeElComprobante,
  EscenarioDeComprobantes,
  reponerEnBase,
  RUTA_DE_CAJA_CHICA,
  usuarioIdDe,
} from './soporte/caja-chica-comprobantes.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;
let cajero: ClienteApi;
let soloVe: ClienteApi;
let delLibro: ClienteApi;

const devolver = (id: string, cliente: ClienteApi = e.propietario()) =>
  cliente.post(`${RUTA_DE_CAJA_CHICA}/comprobantes/${id}/devolver-a-la-bandeja`, { motivo: 'Era de otro fondo' });
const anularEnElLibro = (documentoId: string) =>
  e
    .propietario()
    .post(`${RUTA_DOCUMENTOS}/${documentoId}/anular`, { causa: 'error_de_captura', motivo: 'Mal capturado' });
const eliminarEnElLibro = (documentoId: string) => e.propietario().delete(`${RUTA_DOCUMENTOS}/${documentoId}`);

/** Un documento asignado a un fondo: devuelve su id de documento y el de su comprobante. */
async function documentoEnElFondo(fondoId: string, cambios: Record<string, unknown> = {}) {
  const { documentoId } = await e.registrarEnElLibro({ referenciaDeDestino: fondoId, ...cambios });
  const comprobante = (await e.delFondo(fondoId)).elementos.find((c: any) => c.documentoDeCompraId === documentoId);
  expect(comprobante, 'el documento debía quedar en el fondo').toBeDefined();
  return { documentoId, comprobanteId: comprobante.id as string };
}

const pendienteDe = async (fondoId: string) => (await e.delFondo(fondoId)).totales.pendiente;

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicadevolver');
  const cuenta = e.caja.cuenta;
  cajero = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Cajero',
    apellidos: 'Devolver',
    permisos: ['caja-chica.fondos.ver', 'caja-chica.comprobantes.crear'],
  });
  soloVe = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Solo',
    apellidos: 'Devolver',
    permisos: ['caja-chica.fondos.ver'],
  });
  delLibro = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Libro',
    apellidos: 'Devolver',
    permisos: [
      'libro-de-compras.documentos.ver',
      'libro-de-compras.documentos.anular',
      'libro-de-compras.documentos.eliminar',
    ],
  });
});

async function darAccesoAlCajero(...fondoIds: string[]) {
  const id = await usuarioIdDe(e.caja.cuenta.empresaId, 'Cajero');
  await e.propietario().put(`${RUTA_DE_ACCESOS}/${id}`, { fondoIds });
}

describe('el tope por comprobante', () => {
  it('con el tope del fondo (Q300.00) un documento mayor no se asigna sin el permiso y, al recibirlo, queda en la bandeja', async () => {
    const fondo = await e.abrirFondo('Caja con tope', { monto: '3000.00', topePorComprobante: '300.00' });
    await darAccesoAlCajero(fondo.id);

    const { documentoId, avisos } = await e.registrarEnElLibro({ referenciaDeDestino: fondo.id });
    const { id } = await e.enLaBandeja(documentoId);
    const sinPermiso = await e.asignar(fondo.id, [{ comprobanteId: id }], cajero);

    expect(avisos[0]).toMatch(
      /^Quedó en la bandeja de Caja chica: El comprobante .* es de Q\s1,120\.00 y el tope es de Q\s300\.00/,
    );
    expect(sinPermiso.estado).toBe(403);
    expect(sinPermiso.cuerpo.error.codigo).toBe('comprobante_sobre_el_tope');
    expect((await comprobanteEnBase(id)).fondo_id).toBeNull();
  });

  it('quien tiene el permiso lo asigna con un motivo, y queda marcado; sin motivo se rechaza', async () => {
    const fondo = await e.abrirFondo('Caja con tope y permiso', { monto: '3000.00', topePorComprobante: '300.00' });
    const { documentoId } = await e.registrarEnElLibro();
    const { id } = await e.enLaBandeja(documentoId);

    const sinMotivo = await e.asignar(fondo.id, [{ comprobanteId: id }]);
    const resultado = await e.asignarBien(fondo.id, [{ comprobanteId: id, motivoSobreElTope: 'Medicina urgente' }]);

    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_sobre_el_tope_obligatorio');
    expect(resultado.comprobantes[0]).toMatchObject({ sobreElTope: true, motivoSobreElTope: 'Medicina urgente' });
    expect((await comprobanteEnBase(id)).motivo_sobre_el_tope).toBe('Medicina urgente');
  });

  it('sin tope en el fondo rige el de la empresa (Q2,000.00 por omisión) y una nota de crédito no pasa de ningún tope', async () => {
    const fondo = await e.abrirFondo('Caja sin tope propio', { monto: '10000.00' });
    await darAccesoAlCajero(fondo.id);
    const grande = await e.registrarEnElLibro({ total: '2100.00' });
    const idGrande = (await e.enLaBandeja(grande.documentoId)).id;

    const sobre = await e.asignar(fondo.id, [{ comprobanteId: idGrande }], cajero);

    expect(sobre.cuerpo.error.codigo).toBe('comprobante_sobre_el_tope');
    expect(sobre.cuerpo.error.mensaje).toMatch(/el tope es de Q\s2,000\.00/);
  });
});

describe('devolver un documento a la bandeja', () => {
  it('lo saca del fondo: baja lo pendiente, vuelve con la fecha de emisión y queda auditado `corregir` con su motivo', async () => {
    const fondo = await e.abrirFondo('Caja que devuelve', { monto: '3000.00' });
    await darAccesoAlCajero(fondo.id);
    const { documentoId, comprobanteId } = await documentoEnElFondo(fondo.id);
    expect(await pendienteDe(fondo.id)).toBe('1120.00');

    const devuelto = await devolver(comprobanteId, cajero);

    expect(devuelto.estado, JSON.stringify(devuelto.cuerpo)).toBe(200);
    expect(devuelto.cuerpo).toMatchObject({ fondoId: null, asignadoEn: null, sobreElTope: false });
    expect(await e.enLaBandeja(documentoId)).toMatchObject({ id: comprobanteId, fondoId: null });
    expect(await pendienteDe(fondo.id)).toBe('0.00');
    const [entrada] = await auditoriaDelComprobante(comprobanteId);
    expect(entrada).toMatchObject({ accion: 'corregir', motivo: 'Era de otro fondo' });
    expect(entrada!.anterior).toMatchObject({ fondoId: fondo.id, monto: '1120.00' });
  });

  it('exige comprobantes.crear (403), el fondo a la vista (404) y que esté en un fondo y no repuesto', async () => {
    const fondo = await e.abrirFondo('Caja de la devolución', { monto: '3000.00' });
    const { comprobanteId } = await documentoEnElFondo(fondo.id);
    const vale = (await e.registrarVale(fondo.id)).cuerpo.comprobantes[0];
    const sinAcceso = await devolver(comprobanteId, cajero);
    const sinPermiso = await devolver(comprobanteId, soloVe);
    const deUnVale = await devolver(vale.id);
    await reponerEnBase(e, { fondoId: fondo.id, comprobanteId, monto: '1120.00' });
    const repuesto = await devolver(comprobanteId);

    expect(sinAcceso.estado).toBe(404);
    expect(sinPermiso.estado).toBe(403);
    expect(deUnVale.cuerpo.error.codigo).toBe('solo_un_documento_vuelve_a_la_bandeja');
    expect(repuesto.cuerpo.error.codigo).toBe('comprobante_repuesto');
    expect(repuesto.cuerpo.error.mensaje).toMatch(/^Está en la reposición \d+: anúlela primero\.$/);
    expect(await devolver(crypto.randomUUID())).toMatchObject({ estado: 404 });
  });

  it('uno que ya está en la bandeja no se devuelve, y una factura con notas en el fondo tampoco', async () => {
    const fondo = await e.abrirFondo('Caja de las notas', { monto: '3000.00' });
    const factura = await documentoEnElFondo(fondo.id);
    const nota = await documentoEnElFondo(fondo.id, {
      tipoDte: 'NCRE',
      serie: 'N',
      documentoAfectadoId: factura.documentoId,
      total: '560.00',
    });
    const suelto = await e.registrarEnElLibro();

    const facturaConNota = await devolver(factura.comprobanteId);
    const yaEnLaBandeja = await devolver((await e.enLaBandeja(suelto.documentoId)).id);
    expect((await devolver(nota.comprobanteId)).estado).toBe(200);
    const ahoraSi = await devolver(factura.comprobanteId);

    expect(facturaConNota.cuerpo.error.codigo).toBe('factura_con_notas_en_el_fondo');
    expect(yaEnLaBandeja.cuerpo.error.codigo).toBe('documento_ya_esta_en_la_bandeja');
    expect(ahoraSi.estado).toBe(200);
  });

  it('sacar una nota de crédito sube lo pendiente: si el efectivo no alcanza, se rechaza', async () => {
    const fondo = await e.abrirFondo('Caja ajustada', { monto: '1200.00' });
    const factura = await documentoEnElFondo(fondo.id);
    const nota = await documentoEnElFondo(fondo.id, {
      tipoDte: 'NCRE',
      serie: 'N',
      documentoAfectadoId: factura.documentoId,
      total: '560.00',
    });
    await documentoEnElFondo(fondo.id, { total: '560.00' });

    const rechazo = await devolver(nota.comprobanteId);

    expect(rechazo.cuerpo.error.codigo).toBe('comprobantes_mayores_que_el_efectivo');
    expect(await pendienteDe(fondo.id)).toBe('1120.00');
  });
});

describe('el libro anula o elimina un documento que está en Caja chica', () => {
  it('al anularlo anula el comprobante con el motivo del aviso, baja lo pendiente y queda auditado `anular`', async () => {
    const fondo = await e.abrirFondo('Caja del libro que anula', { monto: '3000.00' });
    const { documentoId, comprobanteId } = await documentoEnElFondo(fondo.id);

    const anulado = await anularEnElLibro(documentoId);

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(await comprobanteEnBase(comprobanteId)).toMatchObject({ estado: 'anulado' });
    expect(await pendienteDe(fondo.id)).toBe('0.00');
    const [entrada] = await auditoriaDelComprobante(comprobanteId);
    expect(entrada).toMatchObject({ accion: 'anular' });
    expect(entrada!.motivo).toContain('Mal capturado');
  });

  it('uno que está en la bandeja se anula sin tocar ningún fondo', async () => {
    const { documentoId } = await e.registrarEnElLibro();

    const anulado = await anularEnElLibro(documentoId);

    expect(anulado.estado).toBe(200);
    expect(await e.enLaBandeja(documentoId)).toBeUndefined();
  });

  it('un comprobante repuesto impide la baja: el libro rechaza y el documento sigue vigente', async () => {
    const fondo = await e.abrirFondo('Caja del libro repuesta', { monto: '3000.00' });
    const { documentoId, comprobanteId } = await documentoEnElFondo(fondo.id);
    await reponerEnBase(e, { fondoId: fondo.id, comprobanteId, monto: '1120.00' });

    const anular = await anularEnElLibro(documentoId);
    const eliminar = await eliminarEnElLibro(documentoId);

    expect(anular.cuerpo.error.codigo).toBe('comprobante_repuesto');
    expect(eliminar.cuerpo.error.codigo).toBe('comprobante_repuesto');
    expect((await e.propietario().get(`${RUTA_DOCUMENTOS}/${documentoId}`)).cuerpo.estado).toBe('vigente');
    expect(await comprobanteEnBase(comprobanteId)).toMatchObject({ estado: 'vigente' });
  });

  it('al eliminarlo borra el comprobante (auditado `eliminar`) y el fondo recupera el efectivo', async () => {
    const fondo = await e.abrirFondo('Caja del libro que elimina', { monto: '3000.00' });
    const { documentoId, comprobanteId } = await documentoEnElFondo(fondo.id);
    const enBandeja = await e.registrarEnElLibro();

    const eliminado = await eliminarEnElLibro(documentoId);
    const eliminadoDeLaBandeja = await eliminarEnElLibro(enBandeja.documentoId);

    expect(eliminado.estado, JSON.stringify(eliminado.cuerpo)).toBe(200);
    expect(eliminadoDeLaBandeja.estado).toBe(200);
    expect(await existeElComprobante(comprobanteId)).toBe(false);
    expect(await e.enLaBandeja(enBandeja.documentoId)).toBeUndefined();
    expect((await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}`)).cuerpo.efectivoEsperado).toBe('3000.00');
    const [entrada] = await auditoriaDelComprobante(comprobanteId);
    expect(entrada).toMatchObject({ accion: 'eliminar' });
    expect(entrada!.anterior).toMatchObject({ monto: '1120.00', fondoId: fondo.id });
  });

  it('quien da la baja en el libro sin tener asignado el fondo recibe un error propio y nada cambia', async () => {
    const fondo = await e.abrirFondo('Caja ajena al libro', { monto: '3000.00' });
    const { documentoId, comprobanteId } = await documentoEnElFondo(fondo.id);

    const anular = await delLibro.post(`${RUTA_DOCUMENTOS}/${documentoId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Mal capturado',
    });
    const eliminar = await delLibro.delete(`${RUTA_DOCUMENTOS}/${documentoId}`);

    expect(anular.estado).toBe(422);
    expect(anular.cuerpo.error.codigo).toBe('comprobante_en_fondo_no_asignado');
    expect(eliminar.estado).toBe(422);
    expect(eliminar.cuerpo.error.codigo).toBe('comprobante_en_fondo_no_asignado');
    expect(await comprobanteEnBase(comprobanteId)).toMatchObject({ estado: 'vigente' });
    expect((await e.propietario().get(`${RUTA_DOCUMENTOS}/${documentoId}`)).cuerpo.estado).toBe('vigente');
    expect(await pendienteDe(fondo.id)).toBe('1120.00');
  });
});
