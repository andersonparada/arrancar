import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, HOY, RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';
import {
  FECHA_VIEJA,
  MES_VIEJO,
  prepararRetenciones,
  reporteDelMes,
  RUTA_RETENCIONES,
  type EscenarioDeRetenciones,
} from './soporte/escenario-de-retenciones.js';

const entorno = usarEntornoApi();
const RUTA = `${RUTA_RETENCIONES}/enteros`;
let e: EscenarioDeRetenciones;
let viejo: string;

const fechasViejas = { fechaEmision: FECHA_VIEJA, fechaRecepcion: FECHA_VIEJA };
const enterar = (cambios: Record<string, unknown> = {}) =>
  e.propietario.post(RUTA, {
    mes: MES_VIEJO.slice(0, 7),
    grupo: 'iva_agentes',
    fechaDePago: HOY,
    documentoDePago: 'sat 2046',
    monto: '90.00',
    ...cambios,
  });
const grupoDelMes = async (mes: string, grupo = 'iva_agentes') =>
  (await reporteDelMes(e.propietario, mes)).grupos.find((g: { grupo: string }) => g.grupo === grupo);

beforeAll(async () => {
  e = await prepararRetenciones(entorno, 'retencionesenteros');
  viejo = (await e.registrar(e.escenario.proveedorId, fechasViejas)).id;
  await e.registrar(e.escenario.proveedorId, fechasViejas);
});

afterAll(() => vi.restoreAllMocks());

describe('enteros: estado del mes y grupo', () => {
  it('sin pagos un mes con retenciones de hace meses está vencido y avisa', async () => {
    const grupo = await grupoDelMes(MES_VIEJO);

    expect(grupo).toMatchObject({ retenido: '180.00', pagado: '0.00', estado: 'vencido', diferencia: '180.00' });
    expect(grupo.aviso).toContain('venció');
  });

  it('un pago parcial deja el mes con diferencia y apaga el aviso de vencido', async () => {
    const respuesta = await enterar();

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.entero).toMatchObject({
      grupo: 'iva_agentes',
      documentoDePago: 'SAT2046',
      monto: '90.00',
      retenidoAlMarcar: '180.00',
      estado: 'vigente',
    });
    expect(respuesta.cuerpo.entero.registradoPor).toEqual(expect.any(String));
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('Falta enterar Q90.00');
    const grupo = await grupoDelMes(MES_VIEJO);
    expect(grupo).toMatchObject({ pagado: '90.00', estado: 'con_diferencia', aviso: null });
  });

  it('un segundo pago complementario lo deja enterado con los dos pagos a la vista', async () => {
    const respuesta = await enterar({ documentoDePago: 'SAT2046-C' });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.avisos).toEqual([]);
    const grupo = await grupoDelMes(MES_VIEJO);
    expect(grupo).toMatchObject({ pagado: '180.00', estado: 'enterado', aviso: null, diferencia: '0.00' });
    expect(grupo.pagos.map((pago: { documentoDePago: string }) => pago.documentoDePago)).toEqual([
      'SAT2046',
      'SAT2046-C',
    ]);
  });

  it('rechaza enterar un mes y grupo sin retenciones y los datos mal escritos', async () => {
    const sinRetenciones = await enterar({ grupo: 'isr_opcional' });
    const deOtroGrupo = await enterar({ grupo: 'otro' });
    const sinMonto = await enterar({ monto: '0.00' });
    const mesMalo = await enterar({ mes: '2026-15' });
    const antesDelMes = await enterar({ fechaDePago: '2020-01-01' });

    expect(sinRetenciones.cuerpo.error.codigo).toBe('sin_retenciones_que_enterar');
    expect(deOtroGrupo.estado).toBe(400);
    expect(sinMonto.cuerpo.error.codigo).toBe('monto_del_entero_invalido');
    expect(mesMalo.estado).toBe(400);
    expect(antesDelMes.cuerpo.error.codigo).toBe('fecha_de_pago_invalida');
  });
});

describe('enteros: avisos al registrar y al anular', () => {
  it('registrar en un mes ya enterado pide pagar la diferencia en vez de avisar del plazo', async () => {
    const respuesta = await e.registrar(e.escenario.proveedorId, fechasViejas);

    const avisos = respuesta.cuerpo.avisos.join(' ');
    expect(avisos).toContain('Ese mes ya se enteró');
    expect(avisos).not.toContain('venció');
    expect((await grupoDelMes(MES_VIEJO)).estado).toBe('con_diferencia');
  });

  it('anular un documento de un mes enterado avisa que hay que rectificar', async () => {
    const respuesta = await e.propietario.post(`${RUTA_DOCUMENTOS}/${viejo}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Error',
    });

    const avisos = respuesta.cuerpo.avisos.join(' ');
    expect(avisos).toContain('Queda 1 retención por resolver');
    expect(avisos).toContain('Ese mes ya se enteró: rectifique el entero.');
    const [pendiente] = (await e.propietario.get(`${RUTA_RETENCIONES}/por-resolver`)).cuerpo;
    expect(pendiente).toMatchObject({ accionSugerida: 'rectificar_entero', enterada: true });
  });

  it('eliminar un documento de un mes enterado queda bloqueado', async () => {
    const { id } = await e.registrar(e.escenario.proveedorId, fechasViejas);

    const respuesta = await e.propietario.delete(`${RUTA_DOCUMENTOS}/${id}`);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('documento_con_retencion_enterada');
  });
});

describe('enteros: corregir, anular y la matriz del año', () => {
  it('corregir cambia lo escrito y se audita; anular lo deja como rastro y no cuenta', async () => {
    const grupo = await grupoDelMes(MES_VIEJO);
    const pago = grupo.pagos[1];

    const corregido = await e.propietario.put(`${RUTA}/${pago.id}`, {
      fechaDePago: HOY,
      documentoDePago: 'SAT2046-D',
      monto: '100.00',
      observaciones: 'Complemento corregido',
    });
    const anulado = await e.propietario.post(`${RUTA}/${pago.id}/anular`, { motivo: 'Pago duplicado' });
    const otraVez = await e.propietario.post(`${RUTA}/${pago.id}/anular`, { motivo: 'Otra vez' });
    const sinMotivo = await e.propietario.post(`${RUTA}/${grupo.pagos[0].id}/anular`, { motivo: ' ' });

    expect(corregido.cuerpo.entero).toMatchObject({ documentoDePago: 'SAT2046-D', monto: '100.00' });
    expect(anulado.cuerpo.entero).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Pago duplicado' });
    expect(otraVez.cuerpo.error.codigo).toBe('entero_ya_anulado');
    expect(sinMotivo.estado).toBe(400);
    const auditadas = await consultar<{ accion: string; anterior: { monto: string } }>(
      "select accion, anterior from core.auditoria where recurso = 'libro-de-compras.enteros-de-retenciones' and registro_id = $1 order by creado_en",
      [pago.id],
    );
    expect(auditadas.map((a) => a.accion)).toEqual(['corregir', 'anular']);
    expect(auditadas[0]?.anterior.monto).toBe('90.00');
    const despues = await grupoDelMes(MES_VIEJO);
    expect(despues.pagado).toBe('90.00');
  });

  it('la matriz del año da cada mes y grupo con retenido, plazo, pagado y estado', async () => {
    const anio = Number(MES_VIEJO.slice(0, 4));

    const respuesta = await e.propietario.get(`${RUTA}?anio=${anio}`);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.meses).toHaveLength(12);
    const mes = respuesta.cuerpo.meses.find((m: { mes: string }) => m.mes === MES_VIEJO);
    expect(mes.grupos).toHaveLength(4);
    expect(mes.grupos[0]).toMatchObject({ grupo: 'iva_agentes', pagado: '90.00', estado: 'con_diferencia' });
    expect(mes.grupos[0].plazo > MES_VIEJO).toBe(true);
  });
});
