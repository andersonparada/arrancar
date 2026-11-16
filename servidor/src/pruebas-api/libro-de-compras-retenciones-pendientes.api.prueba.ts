import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY, RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';
import {
  FECHA_VIEJA,
  MES_DE_HOY,
  MES_VIEJO,
  prepararRetenciones,
  reporteDelMes,
  RUTA_RETENCIONES,
  type EscenarioDeRetenciones,
} from './soporte/escenario-de-retenciones.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const RUTA = `${RUTA_RETENCIONES}/constancias-pendientes`;
const PREFIJO = 'libro-de-compras.retenciones';
const fechasViejas = { fechaEmision: FECHA_VIEJA, fechaRecepcion: FECHA_VIEJA };
let e: EscenarioDeRetenciones;
let ivaViejo: string;
let conConstancia: string;
let anulado: string;
let isrDeHoy: string;

const pendientes = async (filtros = '') => {
  const respuesta = await e.propietario.get(`${RUTA}${filtros ? `?${filtros}` : ''}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};
/** Los documentos distintos de las retenciones pendientes (el del régimen simplificado trae IVA e ISR). */
const documentosDe = (reporte: { pendientes: any[] }) => [
  ...new Set<string>(reporte.pendientes.map((p) => p.retencion.documento.id)),
];

beforeAll(async () => {
  e = await prepararRetenciones(entorno, 'retencionespendientes');
  ivaViejo = (await e.registrar(e.escenario.proveedorId, fechasViejas)).id;
  conConstancia = (await e.registrar(e.escenario.proveedorId, fechasViejas)).id;
  isrDeHoy = (await e.registrar(e.opcional)).id;
  anulado = (await e.registrar(e.escenario.proveedorId)).id;
  const filasViejas = (await reporteDelMes(e.propietario, MES_VIEJO)).retenciones;
  const fila = filasViejas.find((f: any) => f.documento.id === conConstancia);
  const anotada = await e.propietario.put(`${RUTA_RETENCIONES}/${fila.id}/constancia`, { numero: 'c-1', fecha: HOY });
  expect(anotada.estado, JSON.stringify(anotada.cuerpo)).toBe(200);
  const baja = await e.propietario.post(`${RUTA_DOCUMENTOS}/${anulado}/anular`, {
    causa: 'error_de_captura',
    motivo: 'x',
  });
  expect(baja.estado).toBe(200);
});

afterAll(() => vi.restoreAllMocks());

describe('constancias de retención pendientes', () => {
  it('trae los meses viejos y el actual, sin los que ya tienen constancia', async () => {
    const reporte = await pendientes();

    expect(documentosDe(reporte).sort()).toEqual([ivaViejo, isrDeHoy].sort());
    expect(reporte.pendientes.map((p: any) => p.mes)).toEqual([MES_VIEJO, MES_DE_HOY, MES_DE_HOY]);
    expect(reporte.total).toEqual({ cantidad: 3, retenido: '430.00' });
    expect(reporte.totales.map((t: any) => [t.mes, t.grupo, t.cantidad, t.retenido])).toEqual([
      [MES_VIEJO, 'iva_agentes', 1, '90.00'],
      [MES_DE_HOY, 'isr_opcional', 1, '250.00'],
      [MES_DE_HOY, 'iva_agentes', 1, '90.00'],
    ]);
  });

  it('el IVA viejo trae su plazo de entero vencido, sin enterar y sin plazo propio de constancia', async () => {
    const [iva] = (await pendientes()).pendientes;

    expect(iva).toMatchObject({
      grupo: 'iva_agentes',
      plazoVencido: true,
      enterado: false,
      plazoDeLaConstancia: null,
      notaDelPlazo: 'Sin plazo propio confirmado',
    });
    expect(iva.diasParaElPlazo).toBeLessThan(0);
    expect(iva.retencion).toMatchObject({ retenido: '90.00', constanciaNumero: null });
  });

  it('el ISR trae el plazo de la constancia: cinco días hábiles del mes siguiente', async () => {
    const reporte = await pendientes('grupo=isr_opcional');

    const [isr] = reporte.pendientes;
    expect(reporte.pendientes).toHaveLength(1);
    expect(isr.plazoDeLaConstancia).toMatch(/^\d{4}-\d{2}-0[1-9]$/);
    expect(isr.plazoDeLaConstancia > isr.retencion.fecha.slice(0, 7)).toBe(true);
    expect(isr.retencion.retenido).toBe('250.00');
  });

  it('las de documentos anulados van aparte y no suman', async () => {
    const reporte = await pendientes();

    expect(reporte.anuladas.map((a: any) => a.retencion.documento.id)).toEqual([anulado]);
    expect(reporte.total.cantidad).toBe(3);
  });

  it('filtra por el último mes, por proveedor y por grupo', async () => {
    const hastaElViejo = await pendientes(`hasta=${MES_VIEJO.slice(0, 7)}`);
    const delOpcional = await pendientes(`proveedorId=${e.opcional}`);
    const delIvaDeAgentes = await pendientes('grupo=iva_agentes');

    expect(documentosDe(hastaElViejo)).toEqual([ivaViejo]);
    expect(documentosDe(delOpcional)).toEqual([isrDeHoy]);
    expect(documentosDe(delIvaDeAgentes).sort()).toEqual([ivaViejo, isrDeHoy].sort());
  });

  it('con un entero vigente del mes dice «enterado»', async () => {
    const enterado = await e.propietario.post(`${RUTA_RETENCIONES}/enteros`, {
      mes: MES_VIEJO.slice(0, 7),
      grupo: 'iva_agentes',
      fechaDePago: HOY,
      documentoDePago: 'sat 1',
      impuesto: '180.00',
    });
    expect(enterado.estado, JSON.stringify(enterado.cuerpo)).toBe(201);

    const [iva] = (await pendientes()).pendientes;

    expect(iva.enterado).toBe(true);
  });

  it('rechaza un mes mal escrito y un proveedor que no es uuid', async () => {
    expect((await e.propietario.get(`${RUTA}?hasta=2026-13`)).estado).toBe(400);
    expect((await e.propietario.get(`${RUTA}?proveedorId=abc`)).estado).toBe(400);
  });

  it('el Excel lleva el mismo filtro que la pantalla', async () => {
    const respuesta = await e.propietario.get(`${RUTA}/exportar?grupo=iva_agentes`);

    expect(respuesta.estado).toBe(200);
    expect(String(respuesta.cabeceras['content-type'])).toContain('spreadsheetml');
    expect(Buffer.isBuffer(respuesta.cuerpo) && respuesta.cuerpo.subarray(0, 2).toString()).toBe('PK');
  });
});

describe('permisos de las constancias pendientes', () => {
  let soloVer: ClienteApi;
  let exportador: ClienteApi;
  const usuario = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.escenario.cuenta, { nombres, apellidos: 'Pendientes', permisos });

  beforeAll(async () => {
    soloVer = await usuario('Solo ver', [`${PREFIJO}.ver`]);
    exportador = await usuario('Exportador', [`${PREFIJO}.exportar`]);
  });

  it('ver lista y no baja el Excel; exportar baja el Excel y no lista', async () => {
    expect([(await soloVer.get(RUTA)).estado, (await soloVer.get(`${RUTA}/exportar`)).estado]).toEqual([200, 403]);
    expect([(await exportador.get(RUTA)).estado, (await exportador.get(`${RUTA}/exportar`)).estado]).toEqual([
      403, 200,
    ]);
  });

  it('sin sesión responde 401', async () => {
    expect((await entorno.nuevoCliente().get(RUTA)).estado).toBe(401);
  });
});
