/**
 * Los vales de gasto de Caja chica (CC-3, §5.4 d y e): un gasto menor sin factura con su número, el tope del vale con su
 * permiso de excepción, que el efectivo alcance, y anularlo. La opción `caja-chica.vales_de_gasto.permitidos` los apaga.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { RUTA_DE_ACCESOS, RUTA_DE_FONDOS } from './soporte/caja-chica-fondos.js';
import {
  auditoriaDelComprobante,
  comprobanteEnBase,
  EscenarioDeComprobantes,
  RUTA_DE_CAJA_CHICA,
  usuarioIdDe,
} from './soporte/caja-chica-comprobantes.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;
let cajero: ClienteApi;
let conTope: ClienteApi;
let fondoId: string;

const anularVale = (id: string, cliente: ClienteApi = e.propietario()) =>
  cliente.post(`${RUTA_DE_CAJA_CHICA}/comprobantes/${id}/anular`, { motivo: 'Se registró dos veces' });

async function fijarVariable(clave: string, valor: unknown): Promise<void> {
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: e.caja.cuenta.empresaId });
  const cambio = await entorno.soporte.put(`/api/configuracion/${clave}`, { nivel: 'empresa', valor });
  expect(cambio.estado, JSON.stringify(cambio.cuerpo)).toBe(204);
}

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicavales');
  const cuenta = e.caja.cuenta;
  const base = ['caja-chica.fondos.ver', 'caja-chica.comprobantes.crear'];
  cajero = await crearUsuarioConPermisos(entorno, cuenta, { nombres: 'Cajero', apellidos: 'Vales', permisos: base });
  conTope = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Con',
    apellidos: 'Tope',
    permisos: [...base, 'caja-chica.comprobantes.sobre-el-tope', 'caja-chica.comprobantes.anular'],
  });
  fondoId = (await e.abrirFondo('Caja de los vales', { monto: '1000.00' })).id;
  for (const nombres of ['Cajero', 'Con']) {
    const id = await usuarioIdDe(cuenta.empresaId, nombres);
    await e.propietario().put(`${RUTA_DE_ACCESOS}/${id}`, { fondoIds: [fondoId] });
  }
});

describe('registrar un vale de gasto', () => {
  it('lleva su número correlativo, no es deducible, sube lo pendiente y baja el efectivo', async () => {
    const primero = await e.registrarVale(fondoId, { monto: '50.00' });
    const segundo = await e.registrarVale(fondoId, { monto: '25.50', descripcion: 'Estacionamiento' });

    expect(primero.estado, JSON.stringify(primero.cuerpo)).toBe(201);
    expect(primero.cuerpo.avisos).toEqual([]);
    const [vale] = primero.cuerpo.comprobantes;
    expect(vale).toMatchObject({
      clase: 'vale_de_gasto',
      fondoId,
      fecha: HOY,
      monto: '50.00',
      resta: false,
      numero: 1,
      descripcion: 'Peaje',
      pagadoA: 'Pedro López',
      conceptoDeGastoId: e.conceptoId,
      motivoSinDocumento: 'El peaje no da factura',
      sobreElTope: false,
      documento: null,
    });
    expect(segundo.cuerpo.comprobantes[0].numero).toBe(2);
    const ficha = (await e.propietario().get(`${RUTA_DE_FONDOS}/${fondoId}`)).cuerpo;
    expect(ficha).toMatchObject({ pendienteDeReponer: '75.50', efectivoEsperado: '924.50' });
    expect(await comprobanteEnBase(vale.id)).toMatchObject({ asignado_por: await e.propietarioId(), numero: 1 });
  });

  it('rechaza un monto en cero o mal escrito, una fecha futura o anterior a la apertura, y un concepto que no existe', async () => {
    const enCero = await e.registrarVale(fondoId, { monto: '0.00' });
    const malEscrito = await e.registrarVale(fondoId, { monto: '12,5' });
    const futura = await e.registrarVale(fondoId, { fecha: '2999-01-01' });
    const anterior = await e.registrarVale(fondoId, { fecha: '2000-01-01' });
    const sinConcepto = await e.registrarVale(fondoId, { conceptoDeGastoId: crypto.randomUUID() });
    const sinMotivo = await e.registrarVale(fondoId, { motivoSinDocumento: '  ' });

    expect(enCero.cuerpo.error.codigo).toBe('monto_del_comprobante_invalido');
    expect(malEscrito.estado).toBe(400);
    expect(futura.cuerpo.error.codigo).toBe('fecha_del_comprobante_invalida');
    expect(anterior.cuerpo.error.codigo).toBe('fecha_del_comprobante_invalida');
    expect(sinConcepto.cuerpo.error.codigo).toBe('concepto_de_gasto_invalido');
    expect(sinMotivo.estado).toBe(400);
  });

  it('no deja gastar más efectivo del que tiene el fondo', async () => {
    const chico = await e.abrirFondo('Caja casi vacía', { monto: '100.00' });
    await e.registrarVale(chico.id, { monto: '80.00' });

    const rechazo = await e.registrarVale(chico.id, { monto: '30.00' });

    expect(rechazo.estado).toBe(422);
    expect(rechazo.cuerpo.error.codigo).toBe('comprobantes_mayores_que_el_efectivo');
    expect((await e.delFondo(chico.id)).elementos).toHaveLength(1);
  });

  it('exige comprobantes.crear (403) y el fondo a la vista (404)', async () => {
    const soloVe = await crearUsuarioConPermisos(entorno, e.caja.cuenta, {
      nombres: 'Solo',
      apellidos: 'Vales',
      permisos: ['caja-chica.fondos.ver'],
    });
    const ajeno = await e.abrirFondo('Caja ajena de vales', { monto: '500.00' });

    const sinPermiso = await e.registrarVale(fondoId, {}, soloVe);
    const alAjeno = await e.registrarVale(ajeno.id, {}, cajero);

    expect(sinPermiso.estado).toBe(403);
    expect(alAjeno.estado).toBe(404);
  });
});

describe('el tope del vale', () => {
  it('pasar de Q200.00 pide el permiso de excepción (403) y su motivo; con los dos queda marcado', async () => {
    const sinPermiso = await e.registrarVale(fondoId, { monto: '250.00' }, cajero);
    const sinMotivo = await e.registrarVale(fondoId, { monto: '250.00' }, conTope);
    const conMotivo = await e.registrarVale(
      fondoId,
      { monto: '250.00', motivoSobreElTope: 'Reparación urgente' },
      conTope,
    );

    expect(sinPermiso.estado).toBe(403);
    expect(sinPermiso.cuerpo.error.codigo).toBe('vale_de_gasto_sobre_el_tope');
    expect(sinMotivo.estado).toBe(400);
    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_sobre_el_tope_obligatorio');
    expect(conMotivo.estado, JSON.stringify(conMotivo.cuerpo)).toBe(201);
    expect(conMotivo.cuerpo.comprobantes[0]).toMatchObject({
      sobreElTope: true,
      motivoSobreElTope: 'Reparación urgente',
    });
  });

  it('el tope sale de la variable de la empresa; con la opción apagada no hay vales de gasto', async () => {
    await fijarVariable('caja-chica.vales_de_gasto.tope', 300);
    const ahoraPasa = await e.registrarVale(fondoId, { monto: '250.00' }, cajero);
    await fijarVariable('caja-chica.vales_de_gasto.permitidos', false);
    const apagado = await e.registrarVale(fondoId, { monto: '10.00' });
    await entorno.soporte.delete('/api/configuracion/caja-chica.vales_de_gasto.permitidos?nivel=empresa');
    await entorno.soporte.delete('/api/configuracion/caja-chica.vales_de_gasto.tope?nivel=empresa');

    expect(ahoraPasa.estado, JSON.stringify(ahoraPasa.cuerpo)).toBe(201);
    expect(apagado.estado).toBe(422);
    expect(apagado.cuerpo.error.codigo).toBe('vales_de_gasto_no_permitidos');
  });
});

describe('anular un vale de gasto', () => {
  it('baja lo pendiente, queda anulado con su motivo y audita `anular` con el vale como estaba', async () => {
    const fondo = await e.abrirFondo('Caja del vale anulado', { monto: '500.00' });
    const { cuerpo } = await e.registrarVale(fondo.id, { monto: '40.00' });
    const vale = cuerpo.comprobantes[0];

    const anulado = await anularVale(vale.id);

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(anulado.cuerpo).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Se registró dos veces' });
    expect((await e.delFondo(fondo.id)).elementos).toEqual([]);
    expect((await e.delFondo(fondo.id, 'anulado')).elementos).toHaveLength(1);
    expect((await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}`)).cuerpo.efectivoEsperado).toBe('500.00');
    const [entrada] = await auditoriaDelComprobante(vale.id);
    expect(entrada).toMatchObject({ accion: 'anular', motivo: 'Se registró dos veces' });
    expect(entrada!.anterior).toMatchObject({ estado: 'vigente', monto: '40.00', numero: vale.numero });
    expect((await anularVale(vale.id)).cuerpo.error.codigo).toBe('comprobante_ya_anulado');
  });

  it('exige comprobantes.anular (403) y un documento del libro no se anula aquí', async () => {
    const fondo = await e.abrirFondo('Caja del permiso de anular', { monto: '3000.00' });
    const { cuerpo } = await e.registrarVale(fondo.id, { monto: '40.00' });
    const { documentoId } = await e.registrarEnElLibro({ referenciaDeDestino: fondo.id });
    const documento = (await e.delFondo(fondo.id)).elementos.find((c: any) => c.documentoDeCompraId === documentoId);

    const sinPermiso = await anularVale(cuerpo.comprobantes[0].id, cajero);
    const unDocumento = await anularVale(documento.id);

    expect(sinPermiso.estado).toBe(403);
    expect(unDocumento.estado).toBe(422);
    expect(unDocumento.cuerpo.error.codigo).toBe('solo_el_vale_de_gasto_se_anula');
  });
});
