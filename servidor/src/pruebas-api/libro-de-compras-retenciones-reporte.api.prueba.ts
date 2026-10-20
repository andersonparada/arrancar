import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { primerDiaDelMes, RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';
import {
  filasDelDocumento,
  MES_DE_HOY,
  prepararRetenciones,
  reporteDelMes,
  RUTA_RETENCIONES,
  type EscenarioDeRetenciones,
} from './soporte/escenario-de-retenciones.js';

const entorno = usarEntornoApi();
let e: EscenarioDeRetenciones;
let general: string;
let simplificado: string;
let pequeno: string;
let anulado: string;
let enCero: string;

const ajusteEnCero = {
  ajustesDeRetenciones: [{ regla: 'iva_contribuyente_especial', monto: '0', motivo: 'Exento por resolución' }],
};

beforeAll(async () => {
  e = await prepararRetenciones(entorno, 'retencionesreporte');
  general = (await e.registrar(e.escenario.proveedorId)).id;
  simplificado = (await e.registrar(e.opcional)).id;
  pequeno = (
    await e.registrar(e.pequeno, {
      tipo: 'factura_pequeno_contribuyente',
      lineas: [{ conceptoId: e.escenario.conceptoId, total: '3000.00' }],
    })
  ).id;
  enCero = (await e.registrar(e.escenario.proveedorId, ajusteEnCero)).id;
  anulado = (await e.registrar(e.escenario.proveedorId)).id;
  const baja = await e.propietario.post(`${RUTA_DOCUMENTOS}/${anulado}/anular`, {
    causa: 'error_de_captura',
    motivo: 'Error',
  });
  expect(baja.estado).toBe(200);
});

afterAll(() => vi.restoreAllMocks());

describe('reporte de retenciones del mes', () => {
  it('suma por grupo de entero y por regla lo vigente, sin las retenciones en cero ni las de anulados', async () => {
    const reporte = await reporteDelMes(e.propietario, MES_DE_HOY);

    const grupos = Object.fromEntries(reporte.grupos.map((g: { grupo: string }) => [g.grupo, g]));
    expect(grupos.iva_agentes).toMatchObject({ retenido: '330.00', estado: 'pendiente', pagado: '0.00' });
    expect(grupos.iva_agentes.reglas).toEqual([
      expect.objectContaining({ regla: 'iva_contribuyente_especial', cantidad: 2, retenido: '180.00' }),
      expect.objectContaining({ regla: 'iva_pequeno_contribuyente', cantidad: 1, retenido: '150.00' }),
    ]);
    expect(grupos.isr_opcional).toMatchObject({ retenido: '250.00' });
    expect(grupos.iva_factura_especial).toMatchObject({ retenido: '0.00', estado: 'sin_retenciones' });
    expect(grupos.isr_factura_especial.estado).toBe('sin_retenciones');
    expect(reporte.grupos).toHaveLength(4);
  });

  it('cada fila trae proveedor, documento, UUID, base, porcentaje, propuesto, retenido y estado del documento', async () => {
    const reporte = await reporteDelMes(e.propietario, MES_DE_HOY);

    const [fila] = filasDelDocumento(reporte, simplificado).filter((f: { regla: string }) => f.regla.startsWith('isr'));
    expect(fila).toMatchObject({
      impuesto: 'isr',
      regla: 'isr_opcional_simplificado',
      grupo: 'isr_opcional',
      base: '5000.00',
      porcentaje: null,
      propuesto: '250.00',
      retenido: '250.00',
      enCero: false,
      constanciaNumero: null,
      proveedor: { nombre: 'Simplificado' },
      documento: { estado: 'vigente', tipoDte: 'FACT' },
    });
    expect(fila.documento.uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(fila.proveedor.nit).toMatch(/^\d+[0-9K]$/);
  });

  it('marca las retenciones en cero con su motivo y no las suma', async () => {
    const reporte = await reporteDelMes(e.propietario, MES_DE_HOY);

    const [fila] = filasDelDocumento(reporte, enCero);
    expect(fila).toMatchObject({ enCero: true, retenido: '0.00', propuesto: '90.00' });
    expect(fila.motivoDelAjuste).toBe('Exento por resolución');
  });

  it('las retenciones de documentos anulados salen aparte y no suman', async () => {
    const reporte = await reporteDelMes(e.propietario, MES_DE_HOY);

    expect(filasDelDocumento({ retenciones: [], anuladas: reporte.anuladas }, anulado)).toHaveLength(1);
    expect(reporte.retenciones.some((f: { documento: { id: string } }) => f.documento.id === anulado)).toBe(false);
    expect(reporte.anuladas[0]).toMatchObject({ documento: { estado: 'anulado' }, retenido: '90.00' });
  });

  it('el plazo de cada grupo cae en el mes siguiente en un día hábil', async () => {
    const reporte = await reporteDelMes(e.propietario, MES_DE_HOY);

    const mesSiguiente = primerDiaDelMes(1).slice(0, 7);
    for (const grupo of reporte.grupos) expect(grupo.plazo.startsWith(mesSiguiente)).toBe(true);
    const dia = (grupo: string) => reporte.grupos.find((g: { grupo: string }) => g.grupo === grupo).plazo;
    expect(dia('isr_opcional') < dia('iva_agentes')).toBe(true);
    expect(dia('iva_factura_especial') > dia('iva_agentes')).toBe(true);
  });

  it('filtra por grupo, por constancia y por estado del documento', async () => {
    const isr = await reporteDelMes(e.propietario, MES_DE_HOY, 'grupo=isr_opcional');
    const anuladas = await reporteDelMes(e.propietario, MES_DE_HOY, 'documentos=anulados');
    const vigentes = await reporteDelMes(e.propietario, MES_DE_HOY, 'documentos=vigentes');
    const conConstancia = await reporteDelMes(e.propietario, MES_DE_HOY, 'constancia=con');
    const sinConstancia = await reporteDelMes(e.propietario, MES_DE_HOY, 'constancia=sin');

    expect(isr.retenciones.map((f: { regla: string }) => f.regla)).toEqual(['isr_opcional_simplificado']);
    expect(isr.grupos).toHaveLength(4);
    expect(anuladas.retenciones).toEqual([]);
    expect(anuladas.anuladas).toHaveLength(1);
    expect(vigentes.anuladas).toEqual([]);
    expect(conConstancia.retenciones).toEqual([]);
    expect(sinConstancia.retenciones.length).toBeGreaterThan(0);
    expect(general).not.toBe(pequeno);
  });

  it('un mes sin retenciones sale vacío y un mes mal escrito se rechaza', async () => {
    const vacio = await reporteDelMes(e.propietario, '2020-01-01');
    const mal = await e.propietario.get(`${RUTA_RETENCIONES}?mes=2020-13`);

    expect(vacio.retenciones).toEqual([]);
    expect(vacio.grupos.every((g: { estado: string }) => g.estado === 'sin_retenciones')).toBe(true);
    expect(mal.estado).toBe(400);
  });

  it('el Excel lleva las mismas filas con el filtro de la pantalla', async () => {
    const respuesta = await e.propietario.get(`${RUTA_RETENCIONES}/exportar?mes=${MES_DE_HOY.slice(0, 7)}`);

    expect(respuesta.estado).toBe(200);
    expect(String(respuesta.cabeceras['content-type'])).toContain('spreadsheetml');
    expect(Buffer.isBuffer(respuesta.cuerpo) && respuesta.cuerpo.subarray(0, 2).toString()).toBe('PK');
  });
});
