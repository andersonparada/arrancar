import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  AVISO_DE_INTERESES_EN_NOTA_DE_DEBITO,
  AVISO_DE_RETENCION_SOBRE_NOTA_DE_DEBITO,
} from '../modulos/libro-de-compras/dominio/reglas-de-notas-de-debito.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  documentoDePrueba,
  haceDias,
  HOY,
  instalarDestinoFalso,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type DestinoFalso,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let destino: DestinoFalso;

const propietario = () => escenario.cuenta.propietario;
const lineaDe = (total: string, exento?: string) => [{ conceptoId: escenario.conceptoId, total, exento }];

/** Una factura de Q1,120.00 (IVA Q120.00) o la que se pida. */
const factura = (cambios: Record<string, unknown> = {}) =>
  propietario().post(RUTA_DOCUMENTOS, documentoDePrueba(escenario, cambios));
const registrarFactura = async (cambios: Record<string, unknown> = {}) => {
  const respuesta = await factura(cambios);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento.id as string;
};
const nota = (
  tipo: 'NCRE' | 'NDEB',
  facturaId: string,
  { total, ...cambios }: { total: string } & Record<string, unknown>,
) =>
  propietario().post(
    RUTA_DOCUMENTOS,
    documentoDePrueba(escenario, {
      tipoDte: tipo,
      documentoAfectadoId: facturaId,
      serie: tipo === 'NDEB' ? 'D' : 'N',
      lineas: lineaDe(total),
      ...cambios,
    }),
  );
const registrarNota = async (...argumentos: Parameters<typeof nota>) => {
  const respuesta = await nota(...argumentos);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento.id as string;
};
const ficha = async (id: string) => (await propietario().get(`${RUTA_DOCUMENTOS}/${id}`)).cuerpo;

beforeAll(async () => {
  destino = instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'notasdedebito');
});

afterAll(() => vi.restoreAllMocks());

describe('registrar una nota de débito', () => {
  it('en plazo: da crédito, no retiene, llega al destino como nota de débito y la ficha de la factura la lista', async () => {
    const facturaId = await registrarFactura();

    const respuesta = await nota('NDEB', facturaId, { total: '560.00' });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento).toMatchObject({
      tipo: 'nota_de_debito',
      tipoDte: 'NDEB',
      documentoAfectadoId: facturaId,
      motivoSinCredito: null,
      totales: { total: '560.00', iva: '60.00', ivaNoAcreditable: '0.00' },
      retenciones: [],
    });
    expect(destino.recibidos.at(-1)).toMatchObject({
      tipo: 'nota_de_debito',
      documentoAfectadoId: facturaId,
      totalCentavos: 56000,
      retencionesCentavos: 0,
    });
    const deLaFactura = await ficha(facturaId);
    expect(deLaFactura.notas).toEqual([
      expect.objectContaining({ tipo: 'nota_de_debito', total: '560.00', estado: 'vigente' }),
    ]);
    expect(deLaFactura.totalAjustado).toBe('1680.00');
    expect(deLaFactura).toMatchObject({ puedeAnular: false, puedeEliminar: false });
    const deLaNota = await ficha(respuesta.cuerpo.documento.id);
    expect(deLaNota).toMatchObject({ totalAjustado: null, puedeAnular: true, puedeEliminar: true, notas: [] });
  });

  it('emitida más de dos meses después de su factura no da crédito (art. 17)', async () => {
    const facturaId = await registrarFactura({ fechaEmision: haceDias(100), fechaRecepcion: HOY });

    const respuesta = await nota('NDEB', facturaId, { total: '560.00', fechaEmision: haceDias(10) });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento).toMatchObject({
      motivoSinCredito: 'nota_de_debito_tardia',
      totales: { iva: '60.00', ivaNoAcreditable: '60.00' },
    });
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('art. 17');
  });

  it('sobre una factura exenta no puede traer IVA', async () => {
    const facturaId = await registrarFactura({ lineas: lineaDe('1120.00', '1120.00') });

    const conIva = await nota('NDEB', facturaId, { total: '560.00' });
    const exenta = await nota('NDEB', facturaId, { total: '560.00', lineas: lineaDe('560.00', '560.00') });

    expect(conIva.estado).toBe(422);
    expect(conIva.cuerpo.error.codigo).toBe('nota_con_iva_de_factura_exenta');
    expect(exenta.estado).toBe(201);
  });

  it('antes de la fecha de su factura, o sin factura, se rechaza', async () => {
    const facturaId = await registrarFactura({ fechaEmision: haceDias(3) });

    const anterior = await nota('NDEB', facturaId, { total: '560.00', fechaEmision: haceDias(5) });
    const sinFactura = await nota('NDEB', facturaId, { total: '560.00', documentoAfectadoId: null, numero: '900' });

    expect(anterior.cuerpo.error.codigo).toBe('nota_de_debito_anterior_a_la_factura');
    expect(sinFactura.estado).toBe(400);
  });

  it('la clase de cargo `intereses` agrega el aviso de gasto financiero; no se guarda', async () => {
    const facturaId = await registrarFactura();

    const intereses = await nota('NDEB', facturaId, { total: '56.00', claseDeCargo: 'intereses' });
    const precio = await nota('NDEB', facturaId, { total: '56.00', claseDeCargo: 'precio', numero: '801' });
    const invalida = await nota('NDEB', facturaId, { total: '56.00', claseDeCargo: 'multa', numero: '802' });

    expect(intereses.cuerpo.avisos).toContain(AVISO_DE_INTERESES_EN_NOTA_DE_DEBITO);
    expect(precio.cuerpo.avisos).not.toContain(AVISO_DE_INTERESES_EN_NOTA_DE_DEBITO);
    expect(intereses.cuerpo.documento).not.toHaveProperty('claseDeCargo');
    expect(invalida.estado).toBe(400);
  });
});

describe('tope de las notas de crédito con la nota de débito', () => {
  it('la nota de crédito cabe en la factura más sus notas de débito, y ni un centavo más', async () => {
    const sola = await registrarFactura();
    const conNdeb = await registrarFactura();
    await registrarNota('NDEB', conNdeb, { total: '560.00' });

    const sinNdeb = await nota('NCRE', sola, { total: '1680.00' });
    const justa = await nota('NCRE', conNdeb, { total: '1680.00' });
    const demas = await nota('NCRE', conNdeb, { total: '0.01', numero: '700' });

    expect(sinNdeb.estado).toBe(422);
    expect(['nota_supera_la_factura', 'iva_de_notas_excede_el_de_la_factura']).toContain(sinNdeb.cuerpo.error.codigo);
    expect(justa.estado).toBe(201);
    expect(demas.estado).toBe(422);
    expect(demas.cuerpo.error.codigo).toBe('nota_supera_la_factura');
    expect((await ficha(conNdeb)).totalAjustado).toBe('0.00');
  });
});

describe('aviso a las empresas agentes', () => {
  it('a la empresa agente de retención se le recuerda consultar con su contador, sin calcularle retenciones', async () => {
    const facturaId = await registrarFactura();

    const respuesta = await nota('NDEB', facturaId, { total: '56.00' });

    expect(respuesta.cuerpo.avisos).toContain(AVISO_DE_RETENCION_SOBRE_NOTA_DE_DEBITO);
    expect(respuesta.cuerpo.documento.retenciones).toEqual([]);
  });

  it('a la que no es agente no se le dice nada', async () => {
    escenario = await prepararEscenario(entorno, 'notasdedebitosinagente');
    await configurarEmpresa(escenario.cuenta, { agenteDeRetencionIva: 'ninguno', esAgenteDeRetencionIsr: false });
    const facturaId = await registrarFactura();

    const respuesta = await nota('NDEB', facturaId, { total: '56.00' });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.avisos).not.toContain(AVISO_DE_RETENCION_SOBRE_NOTA_DE_DEBITO);
  });
});
