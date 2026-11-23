/**
 * Documentos de venta (LV-2), reglas fiscales por la API: el régimen del mes del documento, los períodos declarados que
 * lleva Libro de compras, la derogación, las notas, la factura especial recibida y el envío a la cartera.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, HOY, primerDiaDelMes } from './soporte/escenario-de-documentos.js';
import { apagarElBloqueo, declarar, encenderElBloqueo, reabrir } from './soporte/escenario-de-periodos.js';
import {
  documentoDeVentaDePrueba,
  instalarCarteraFalsa,
  prepararEscenarioDeVentas,
  RUTA_DOCUMENTOS_DE_VENTA as RUTA,
  type CarteraFalsa,
  type EscenarioDeVentas,
} from './soporte/escenario-de-ventas.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeVentas;
let cartera: CarteraFalsa;
let operador: Operador;

const propietario = () => escenario.cuenta.propietario;
const HACE_DOS_MESES = primerDiaDelMes(-2);
const HACE_CUATRO_MESES = primerDiaDelMes(-4);
const el10 = (mes: string) => `${mes.slice(0, 8)}10`;
const registrar = (cambios: Record<string, unknown> = {}) =>
  propietario().post(RUTA, documentoDeVentaDePrueba(escenario, cambios));
const anular = (id: string, cambios: Record<string, unknown> = {}) =>
  propietario().post(`${RUTA}/${id}/anular`, { causa: 'error_de_captura', motivo: 'Prueba', ...cambios });

beforeAll(async () => {
  cartera = instalarCarteraFalsa();
  escenario = await prepararEscenarioDeVentas(entorno, 'ventasfiscal');
  const [usuario] = await consultar<{ id: string }>('select id from core.usuarios where usuario = $1', [
    escenario.cuenta.usuario,
  ]);
  const { cuentaId, empresaId } = escenario.cuenta;
  operador = { usuarioId: usuario!.id, cuentaId, empresaId, esSuperacceso: false };
});

afterAll(() => vi.restoreAllMocks());

describe('familias que no son del régimen', () => {
  it('una familia que no corresponde al régimen del mes avisa y no bloquea', async () => {
    const respuesta = await registrar({ tipo: 'factura_pequeno_contribuyente', serie: 'AVI', numero: '1' });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.avisos).toEqual([expect.stringContaining('no corresponde al régimen')]);
  });
});

describe('familias derogadas', () => {
  it('una familia derogada se rechaza desde la fecha de derogación y vale antes (histórico)', async () => {
    const reciente = await registrar({ tipo: 'factura_contribuyente_agropecuario', serie: 'DER', numero: '1' });
    const historico = await registrar({
      tipo: 'factura_contribuyente_agropecuario',
      fechaEmision: '2025-06-10',
      serie: 'DER',
      numero: '2',
    });

    expect(reciente.estado).toBe(422);
    expect(reciente.cuerpo.error.codigo).toBe('regimen_derogado');
    expect(historico.estado).toBe(201);
  });
});

describe('períodos declarados (los lleva Libro de compras)', () => {
  it('con el control apagado solo avisa; con él encendido se rechaza hasta reabrir', async () => {
    const mes = HACE_DOS_MESES;
    const base = await registrar({ fechaEmision: el10(mes), serie: 'DEC', numero: '1' });
    expect((await declarar(propietario(), mes)).estado).toBe(200);

    const avisa = await registrar({ fechaEmision: el10(mes), serie: 'DEC', numero: '2' });
    await encenderElBloqueo(propietario());
    const rechazada = await registrar({ fechaEmision: el10(mes), serie: 'DEC', numero: '3' });
    const anulacion = await anular(base.cuerpo.documento.id);
    const eliminacion = await propietario().delete(`${RUTA}/${base.cuerpo.documento.id}`);
    expect((await reabrir(propietario(), mes)).estado).toBe(200);
    const trasReabrir = await registrar({ fechaEmision: el10(mes), serie: 'DEC', numero: '3' });
    await apagarElBloqueo(propietario());

    expect(avisa.cuerpo.avisos).toContain(`El período ${mes.slice(0, 7)} ya se declaró: rectifique su declaración.`);
    expect(rechazada.estado).toBe(422);
    expect(rechazada.cuerpo.error.codigo).toBe('periodo_declarado');
    expect(anulacion.cuerpo.error.codigo).toBe('periodo_declarado');
    expect(eliminacion.cuerpo.error.codigo).toBe('periodo_declarado');
    expect(trasReabrir.estado).toBe(201);
  });
});

describe('notas', () => {
  const factura = async (serie: string) => (await registrar({ serie })).cuerpo.documento.id as string;
  const nota = (id: string, serie: string, cambios: Record<string, unknown> = {}) =>
    registrar({ tipo: 'nota_de_credito', documentoAfectadoId: id, serie, ...cambios });

  it('el total y el IVA de las notas de crédito no pasan de la factura con sus notas de débito', async () => {
    const id = await factura('TOP');
    const mitad = [{ conceptoDeIngresoId: escenario.conceptoId, total: '560.00' }];
    const unCentavoMas = [{ conceptoDeIngresoId: escenario.conceptoId, total: '560.01' }];

    const primera = await nota(id, 'N1', { lineas: mitad });
    const pasada = await nota(id, 'N1', { lineas: unCentavoMas });
    const debito = await registrar({ tipo: 'nota_de_debito', documentoAfectadoId: id, serie: 'N1' });
    const conDebito = await nota(id, 'N1', { lineas: unCentavoMas });

    expect(primera.estado).toBe(201);
    expect(pasada.estado).toBe(422);
    expect(pasada.cuerpo.error.codigo).toBe('nota_excede_la_factura');
    expect(debito.estado).toBe(201);
    expect(conDebito.estado).toBe(201);
  });

  it('una nota sin factura, de otro cliente, o sobre una nota, se rechaza', async () => {
    const id = await factura('SIN');
    const otro = await propietario().post('/api/terceros', {
      tipo: 'juridica',
      razonSocial: 'Otro cliente',
      papel: { tipo: 'cliente', clase: 'directo' },
    });
    const ficha = await propietario().get(`/api/terceros/${otro.cuerpo.id}`);
    const primera = await nota(id, 'N2');

    const sinFactura = await registrar({ tipo: 'nota_de_credito', serie: 'N2' });
    const deOtro = await nota(id, 'N2', { clienteId: ficha.cuerpo.cliente.id });
    const sobreNota = await nota(primera.cuerpo.documento.id, 'N2');

    expect(sinFactura.cuerpo.error.codigo).toBe('nota_sin_factura');
    expect(deOtro.cuerpo.error.codigo).toBe('factura_no_sirve_para_la_nota');
    expect(sobreNota.cuerpo.error.codigo).toBe('factura_no_sirve_para_la_nota');
  });

  it('la nota de crédito pasados los dos meses avisa, y la de abono avisa que no rebaja el IVA', async () => {
    const vieja = await registrar({ fechaEmision: el10(HACE_CUATRO_MESES), serie: 'VIE' });
    const id = vieja.cuerpo.documento.id;

    const tardia = await nota(id, 'N3', { fechaEmision: HOY });
    const abono = await registrar({ tipo: 'nota_de_abono', documentoAfectadoId: id, serie: 'N3' });

    expect(tardia.estado).toBe(201);
    expect(tardia.cuerpo.avisos).toEqual([expect.stringContaining('Fuera del plazo del art. 17')]);
    expect(tardia.cuerpo.documento.periodo).toBe(primerDiaDelMes(0));
    expect(abono.cuerpo.avisos).toEqual([expect.stringContaining('nota de abono no rebaja el IVA')]);
    expect(abono.cuerpo.documento.totales.iva).toBe('0.00');
  });

  it('una nota de la factura especial recibida es error propio', async () => {
    const especial = await registrar({ tipo: 'factura_especial_recibida', serie: 'ESP', numero: '1' });

    const respuesta = await nota(especial.cuerpo.documento.id, 'N4');

    expect(respuesta.cuerpo.error.codigo).toBe('nota_sobre_factura_especial');
  });
});

describe('factura especial recibida', () => {
  it('se registra con el aviso de empresa inscrita, fuera de la cartera y de los reportes de recibo', async () => {
    const respuesta = await registrar({ tipo: 'factura_especial_recibida', serie: 'FES', numero: '1' });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.avisos).toEqual([expect.stringContaining('art. 52')]);
    expect(respuesta.cuerpo.documento).toMatchObject({ destino: null, muestraEnReportesSat: true });
  });

  it('un recibo no va en los reportes de la SAT ni lleva IVA', async () => {
    const respuesta = await registrar({ tipo: 'recibo', serie: 'REC', numero: '1' });

    expect(respuesta.cuerpo.documento).toMatchObject({ muestraEnReportesSat: false, totales: { iva: '0.00' } });
  });
});

describe('la cartera', () => {
  it('una venta a un cliente va a la cartera con sus datos; anular y eliminar la avisan antes', async () => {
    cartera.recibidos.length = 0;
    cartera.avisosDeBaja.length = 0;

    const venta = await registrar({ serie: 'CAR', numero: '1' });
    const otra = await registrar({ serie: 'CAR', numero: '2' });
    await anular(venta.cuerpo.documento.id, { motivo: 'Cambio de cliente' });
    await propietario().delete(`${RUTA}/${otra.cuerpo.documento.id}`);

    expect(venta.cuerpo.documento.destino).toBe('cuentas-por-cobrar');
    expect(cartera.recibidos[0]).toMatchObject({
      documentoId: venta.cuerpo.documento.id,
      tipo: 'factura',
      clase: 'cargo',
      clienteId: escenario.clienteId,
      totalCentavos: 112000,
      moneda: 'GTQ',
      tieneVentaDeActivo: false,
    });
    expect(cartera.avisosDeBaja).toEqual([
      { aviso: 'anular', documentoId: venta.cuerpo.documento.id, motivo: 'Cambio de cliente' },
      { aviso: 'eliminar', documentoId: otra.cuerpo.documento.id, motivo: undefined },
    ]);
  });

  it('si la cartera rechaza el documento o la baja, no se guarda ni se cambia nada', async () => {
    cartera.rechazar = true;
    const rechazada = await registrar({ serie: 'REC', numero: '77' });
    cartera.rechazar = false;
    const guardada = await registrar({ serie: 'REC', numero: '77' });
    cartera.rechazar = true;
    const anulacion = await anular(guardada.cuerpo.documento.id);
    cartera.rechazar = false;

    expect(rechazada.cuerpo.error.codigo).toBe('cartera_rechaza');
    expect(guardada.estado).toBe(201);
    expect(anulacion.cuerpo.error.codigo).toBe('cartera_rechaza');
    expect((await propietario().get(`${RUTA}/${guardada.cuerpo.documento.id}`)).cuerpo.estado).toBe('vigente');
  });

  it('con la cartera apagada una factura ya guardada en ella no se anula, y una nueva no pide cartera', async () => {
    const enCartera = await registrar({ serie: 'OFF', numero: '1' });
    cartera.instalada = false;

    const anulacion = await anular(enCartera.cuerpo.documento.id);
    const nueva = await registrar({ serie: 'OFF', numero: '2' });
    const forzada = await registrar({ serie: 'OFF', numero: '3', destino: 'cuentas-por-cobrar' });
    cartera.instalada = true;

    expect(anulacion.cuerpo.error.codigo).toBe('destino_inactivo');
    expect(nueva.cuerpo.documento.destino).toBeNull();
    expect(forzada.cuerpo.error.codigo).toBe('destino_inactivo');
  });

  it('la orden marcar_procesado impide eliminar el documento, y al devolverlo vuelve a poderse', async () => {
    const venta = await registrar({ serie: 'PRO', numero: '1' });
    const id = venta.cuerpo.documento.id as string;

    await mediador.enviar(operador, 'libro-de-ventas.marcar_procesado', { documentoId: id, procesado: true });
    const marcado = await propietario().get(`${RUTA}/${id}`);
    const eliminacion = await propietario().delete(`${RUTA}/${id}`);
    await mediador.enviar(operador, 'libro-de-ventas.marcar_procesado', { documentoId: id, procesado: false });
    const devuelto = await propietario().get(`${RUTA}/${id}`);

    expect(marcado.cuerpo).toMatchObject({ procesado: true, puedeAnular: true, puedeEliminar: false });
    expect(eliminacion.cuerpo.error.codigo).toBe('documento_procesado');
    expect(devuelto.cuerpo).toMatchObject({ procesado: false, puedeEliminar: true });
  });
});
