/**
 * Los documentos que llegan a Caja chica (CC-3): la orden `caja-chica.recibir_documento` los deja en la bandeja o, con la
 * referencia de un fondo, los asigna; la bandeja y asignarlos a un fondo con sus reglas (fecha, todo o nada, nota de crédito
 * con su factura, permisos y alcance por fondo).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { RUTA_DE_ACCESOS, RUTA_DE_FONDOS } from './soporte/caja-chica-fondos.js';
import { comprobanteEnBase, EscenarioDeComprobantes, usuarioIdDe } from './soporte/caja-chica-comprobantes.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias, HOY, RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;
let cajero: ClienteApi;
let soloVe: ClienteApi;
let sinPermisos: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicabandeja');
  const cuenta = e.caja.cuenta;
  cajero = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Cajero',
    apellidos: 'Bandeja',
    permisos: ['caja-chica.fondos.ver', 'caja-chica.comprobantes.crear'],
  });
  soloVe = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Solo',
    apellidos: 'Bandeja',
    permisos: ['caja-chica.fondos.ver'],
  });
  sinPermisos = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Sin',
    apellidos: 'Bandeja',
    permisos: ['bancos.cuentas-bancarias.ver'],
  });
});

/** Da al cajero acceso a esos fondos (la ventana de asignación reemplaza todo lo que tenía). */
async function darAccesoAlCajero(...fondoIds: string[]) {
  const id = await usuarioIdDe(e.caja.cuenta.empresaId, 'Cajero');
  const respuesta = await e.propietario().put(`${RUTA_DE_ACCESOS}/${id}`, { fondoIds });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
}

describe('recibir un documento del libro', () => {
  it('sin referencia queda en la bandeja, sin fondo, con lo que el libro dice del documento', async () => {
    const { documentoId, avisos } = await e.registrarEnElLibro();

    const comprobante = await e.enLaBandeja(documentoId);

    expect(avisos).toEqual([]);
    expect(comprobante).toMatchObject({
      fondoId: null,
      clase: 'documento',
      estado: 'vigente',
      monto: '1120.00',
      montoRetenido: '0.00',
      conRetencion: false,
      resta: false,
      asignadoEn: null,
      documento: { tipo: 'factura', proveedorNombre: 'Veterinaria El Quiroa', total: '1120.00', enElLibro: true },
    });
  });

  it('con la referencia de un fondo con efectivo se asigna de una vez: sube lo pendiente y baja el efectivo', async () => {
    const fondo = await e.abrirFondo('Caja que recibe', { monto: '3000.00' });

    const { documentoId, avisos } = await e.registrarEnElLibro({ referenciaDeDestino: fondo.id });

    expect(avisos).toEqual([]);
    expect(await e.enLaBandeja(documentoId)).toBeUndefined();
    const { elementos, totales } = await e.delFondo(fondo.id);
    expect(elementos).toMatchObject([{ documentoDeCompraId: documentoId, fondoId: fondo.id, monto: '1120.00' }]);
    expect(totales).toEqual({ pendiente: '1120.00', repuesto: '0.00' });
    const ficha = (await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}`)).cuerpo;
    expect(ficha).toMatchObject({ pendienteDeReponer: '1120.00', efectivoEsperado: '1880.00' });
    expect(await comprobanteEnBase(elementos[0].id)).toMatchObject({ asignado_por: expect.any(String) });
  });

  it('si no se puede asignar queda en la bandeja y el libro recibe el porqué: poco efectivo, fondo que no existe o cerrado', async () => {
    const chico = await e.abrirFondo('Caja chica de más', { monto: '1000.00' });
    const cerrado = await e.abrirFondo('Caja que se cierra');
    await e.propietario().post(`${RUTA_DE_FONDOS}/${cerrado.id}/anular-apertura`, { motivo: 'Se abrió por error' });

    const sinEfectivo = await e.registrarEnElLibro({ referenciaDeDestino: chico.id });
    const noExiste = await e.registrarEnElLibro({ referenciaDeDestino: crypto.randomUUID() });
    const alCerrado = await e.registrarEnElLibro({ referenciaDeDestino: cerrado.id });

    expect(sinEfectivo.avisos[0]).toMatch(/^Quedó en la bandeja de Caja chica: Con esto el fondo gastaría Q\s120\.00/);
    expect(noExiste.avisos[0]).toContain('Quedó en la bandeja de Caja chica: El fondo no existe o no tiene acceso');
    expect(alCerrado.avisos[0]).toContain('Quedó en la bandeja de Caja chica: El fondo está cerrado');
    for (const { documentoId } of [sinEfectivo, noExiste, alCerrado]) {
      expect(await e.enLaBandeja(documentoId)).toMatchObject({ fondoId: null });
    }
  });

  it('un documento no entra dos veces: el libro lo rechaza como repetido y no queda otra fila', async () => {
    const { documentoId } = await e.registrarEnElLibro({ numero: 'REPETIDO-1' });

    const otra = await e.propietario().post(RUTA_DOCUMENTOS, e.cuerpoDeDocumento({ numero: 'REPETIDO-1' }));

    expect(otra.estado).toBeGreaterThanOrEqual(400);
    expect((await e.bandeja()).filter((fila) => fila.documentoDeCompraId === documentoId)).toHaveLength(1);
  });
});

describe('la bandeja', () => {
  it('se filtra por proveedor, fechas y retención, y exige caja-chica.fondos.ver', async () => {
    const vieja = await e.registrarEnElLibro({ fechaEmision: haceDias(40), fechaRecepcion: haceDias(40) });
    const conRetencion = await e.registrarEnElLibro({ total: '5600.00' });

    const delProveedor = await e.bandeja(e.propietario(), `?proveedorId=${e.proveedorId}`);
    const otroProveedor = await e.bandeja(e.propietario(), `?proveedorId=${crypto.randomUUID()}`);
    const viejas = await e.bandeja(e.propietario(), `?hasta=${haceDias(30)}`);
    const recientes = await e.bandeja(e.propietario(), `?desde=${haceDias(30)}`);
    const retenidas = await e.bandeja(e.propietario(), '?conRetencion=true');
    const sinRetencion = await e.bandeja(e.propietario(), '?conRetencion=false');

    const ids = (lista: any[]) => lista.map((fila) => fila.documentoDeCompraId);
    expect(ids(delProveedor)).toEqual(expect.arrayContaining([vieja.documentoId, conRetencion.documentoId]));
    expect(otroProveedor).toEqual([]);
    expect(ids(viejas)).toEqual([vieja.documentoId]);
    expect(ids(recientes)).not.toContain(vieja.documentoId);
    expect(ids(retenidas)).toEqual([conRetencion.documentoId]);
    expect(ids(sinRetencion)).not.toContain(conRetencion.documentoId);
    expect((await sinPermisos.get('/api/caja-chica/bandeja')).estado).toBe(403);
    const fondo = await e.abrirFondo('Caja de la lista sin permiso', { monto: '500.00' });
    expect((await sinPermisos.get(`${RUTA_DE_FONDOS}/${fondo.id}/comprobantes`)).estado).toBe(403);
  });

  it('la ve quien tiene fondos.ver aunque no tenga ningún fondo asignado', async () => {
    const { documentoId } = await e.registrarEnElLibro();

    const lista = await e.bandeja(soloVe);

    expect(lista.map((fila) => fila.documentoDeCompraId)).toContain(documentoId);
  });
});

describe('asignar documentos de la bandeja a un fondo', () => {
  it('un documento pasa al fondo con su fecha, queda asignado a quien lo asignó y deja la bandeja', async () => {
    const fondo = await e.abrirFondo('Caja que asigna', { monto: '3000.00' });
    const { documentoId } = await e.registrarEnElLibro();
    const comprobante = await e.enLaBandeja(documentoId);

    const resultado = await e.asignarBien(fondo.id, [{ comprobanteId: comprobante.id, fecha: HOY }]);

    expect(resultado.avisos).toEqual([]);
    expect(resultado.comprobantes).toMatchObject([{ id: comprobante.id, fondoId: fondo.id, fecha: HOY }]);
    expect(await e.enLaBandeja(documentoId)).toBeUndefined();
    const enBase = await comprobanteEnBase(comprobante.id);
    expect(enBase.fondo_id).toBe(fondo.id);
    expect(enBase.asignado_por).toBe(await e.propietarioId());
  });

  it('lo ya asignado, lo que no existe, una fecha futura, una anterior a la apertura y un repetido se rechazan', async () => {
    const fondo = await e.abrirFondo('Caja de rechazos', { monto: '3000.00' });
    const { documentoId } = await e.registrarEnElLibro();
    const { id } = await e.enLaBandeja(documentoId);
    const mañana = new Date(`${HOY}T00:00:00Z`);
    mañana.setUTCDate(mañana.getUTCDate() + 1);

    const futura = await e.asignar(fondo.id, [{ comprobanteId: id, fecha: mañana.toISOString().slice(0, 10) }]);
    const anterior = await e.asignar(fondo.id, [{ comprobanteId: id, fecha: haceDias(400) }]);
    const repetido = await e.asignar(fondo.id, [{ comprobanteId: id }, { comprobanteId: id }]);
    const inexistente = await e.asignar(fondo.id, [{ comprobanteId: crypto.randomUUID() }]);
    await e.asignarBien(fondo.id, [{ comprobanteId: id }]);
    const yaAsignado = await e.asignar(fondo.id, [{ comprobanteId: id }]);

    expect(futura.cuerpo.error.codigo).toBe('fecha_del_comprobante_invalida');
    expect(anterior.cuerpo.error.codigo).toBe('fecha_del_comprobante_invalida');
    expect(repetido.estado).toBe(400);
    expect(inexistente.estado).toBe(404);
    expect(yaAsignado.cuerpo.error.codigo).toBe('comprobante_ya_asignado');
  });

  it('es todo o nada: si uno de la tanda deja el efectivo en negativo, ninguno se asigna', async () => {
    const fondo = await e.abrirFondo('Caja de la tanda', { monto: '1500.00' });
    const uno = await e.registrarEnElLibro();
    const dos = await e.registrarEnElLibro();
    const idUno = (await e.enLaBandeja(uno.documentoId)).id;
    const idDos = (await e.enLaBandeja(dos.documentoId)).id;

    const rechazo = await e.asignar(fondo.id, [{ comprobanteId: idUno }, { comprobanteId: idDos }]);

    expect(rechazo.cuerpo.error.codigo).toBe('comprobantes_mayores_que_el_efectivo');
    expect(rechazo.cuerpo.error.mensaje).toMatch(/Q\s740\.00/);
    expect((await comprobanteEnBase(idUno)).fondo_id).toBeNull();
    expect((await comprobanteEnBase(idDos)).fondo_id).toBeNull();
    expect((await e.delFondo(fondo.id)).elementos).toEqual([]);
  });

  it('exige comprobantes.crear (403) y el fondo a la vista: sin acceso al fondo es 404, no 403', async () => {
    const fondo = await e.abrirFondo('Caja con acceso', { monto: '3000.00' });
    const ajeno = await e.abrirFondo('Caja ajena', { monto: '3000.00' });
    await darAccesoAlCajero(fondo.id);
    const { documentoId } = await e.registrarEnElLibro();
    const { id } = await e.enLaBandeja(documentoId);

    const sinPermiso = await e.asignar(fondo.id, [{ comprobanteId: id }], soloVe);
    const alAjeno = await e.asignar(ajeno.id, [{ comprobanteId: id }], cajero);
    const propio = await e.asignar(fondo.id, [{ comprobanteId: id }], cajero);

    expect(sinPermiso.estado).toBe(403);
    expect(alAjeno.estado).toBe(404);
    expect(propio.estado, JSON.stringify(propio.cuerpo)).toBe(201);
    expect((await comprobanteEnBase(id)).fondo_id).toBe(fondo.id);
  });

  it('los comprobantes de un fondo solo los ve quien lo tiene asignado', async () => {
    const fondo = await e.abrirFondo('Caja de la lista', { monto: '3000.00' });
    await darAccesoAlCajero(fondo.id);

    const propio = await cajero.get(`${RUTA_DE_FONDOS}/${fondo.id}/comprobantes`);
    const ajeno = await soloVe.get(`${RUTA_DE_FONDOS}/${fondo.id}/comprobantes`);

    expect(propio.estado).toBe(200);
    expect(ajeno.estado).toBe(404);
  });
});

describe('notas de crédito', () => {
  it('van al fondo de su factura y restan de lo pendiente; en otro fondo se rechazan', async () => {
    const fondo = await e.abrirFondo('Caja de la nota', { monto: '3000.00' });
    const otro = await e.abrirFondo('Otra caja de la nota', { monto: '3000.00' });
    const factura = await e.registrarEnElLibro({ referenciaDeDestino: fondo.id });
    const nota = await e.registrarEnElLibro({
      tipoDte: 'NCRE',
      serie: 'N',
      documentoAfectadoId: factura.documentoId,
      total: '560.00',
    });
    const { id } = await e.enLaBandeja(nota.documentoId);

    expect(await e.enLaBandeja(nota.documentoId)).toMatchObject({ resta: true, esNotaDeCredito: true });
    const enOtro = await e.asignar(otro.id, [{ comprobanteId: id }]);
    const enSuFondo = await e.asignarBien(fondo.id, [{ comprobanteId: id }]);

    expect(enOtro.cuerpo.error.codigo).toBe('nota_en_otro_fondo');
    expect(enSuFondo.comprobantes[0]).toMatchObject({ resta: true, monto: '560.00' });
    expect((await e.delFondo(fondo.id)).totales.pendiente).toBe('560.00');
    expect((await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}`)).cuerpo.efectivoEsperado).toBe('2440.00');
  });

  it('con la referencia del fondo de su factura se asigna al recibirla; si su factura sigue en la bandeja, espera', async () => {
    const fondo = await e.abrirFondo('Caja de la nota recibida', { monto: '3000.00' });
    const factura = await e.registrarEnElLibro({ referenciaDeDestino: fondo.id });
    const sinAsignar = await e.registrarEnElLibro();

    const nota = await e.registrarEnElLibro({
      tipoDte: 'NCRE',
      serie: 'N',
      documentoAfectadoId: factura.documentoId,
      total: '560.00',
      referenciaDeDestino: fondo.id,
    });
    const notaDeLaPendiente = await e.registrarEnElLibro({
      tipoDte: 'NCRE',
      serie: 'N',
      documentoAfectadoId: sinAsignar.documentoId,
      total: '112.00',
      referenciaDeDestino: fondo.id,
    });

    expect(nota.avisos).toEqual([]);
    expect(await e.enLaBandeja(nota.documentoId)).toBeUndefined();
    expect(notaDeLaPendiente.avisos[0]).toContain('Quedó en la bandeja de Caja chica: La nota');
    expect(await e.enLaBandeja(notaDeLaPendiente.documentoId)).toBeDefined();
  });
});
