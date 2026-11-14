/**
 * Notas de crédito y de débito sobre facturas del sistema anterior (U8l-4): se registran en el libro del mes de
 * recepción, la factura anterior se guarda una sola vez, y Cuentas por pagar recibe la nota marcada como del sistema
 * anterior.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  haceDias,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
const FECHA_DE_INICIO = haceDias(10);
const FACTURA_ANTERIOR = haceDias(40);

let escenario: EscenarioDeDocumentos;
let numero = 0;

const anterior = (cambios: Record<string, unknown> = {}) => ({
  tipo: 'factura',
  serie: 'B',
  numero: 'F900',
  fechaEmision: FACTURA_ANTERIOR,
  total: '1120.00',
  iva: '120.00',
  motivoSinCredito: null,
  ...cambios,
});

const nota = (tipoDte: 'NCRE' | 'NDEB', cambios: Record<string, unknown> = {}) =>
  documentoDePrueba(escenario, {
    tipoDte,
    serie: tipoDte === 'NCRE' ? 'N' : 'D',
    numero: `NOTA${++numero}`,
    facturaAnterior: anterior(),
    lineas: [{ conceptoId: escenario.conceptoId, total: '560.00' }],
    ...cambios,
  });

const publicar = (ruta: string, cuerpo: Record<string, unknown>) => escenario.cuenta.propietario.post(ruta, cuerpo);

const filasDeFacturasAnteriores = () =>
  consultar<{ id: string; numero: string }>(
    'select id, numero from libro_de_compras.facturas_anteriores where empresa_id = $1',
    [escenario.cuenta.empresaId],
  );

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'notasfacant', MODULOS_DE_CUENTAS_POR_PAGAR);
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: false,
  });
  const guardada = await escenario.cuenta.propietario.put(`/api/empresas/${escenario.cuenta.empresaId}/carga-inicial`, {
    fechaDeInicio: FECHA_DE_INICIO,
  });
  expect(guardada.estado, JSON.stringify(guardada.cuerpo)).toBe(200);
});

describe('registrar una nota sobre una factura del sistema anterior', () => {
  it('calcular no guarda la factura anterior', async () => {
    const calculo = await publicar(`${RUTA_DOCUMENTOS}/calcular`, nota('NCRE'));

    expect(calculo.estado, JSON.stringify(calculo.cuerpo)).toBe(200);
    expect(calculo.cuerpo.documento.facturaAnterior).toMatchObject({ numero: 'F900', iva: '120.00' });
    expect(await filasDeFacturasAnteriores()).toEqual([]);
  });

  it('la nota de crédito queda ligada a la factura anterior y Cuentas por pagar la marca como del sistema anterior', async () => {
    const respuesta = await publicar(RUTA_DOCUMENTOS, nota('NCRE'));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    const documentoId = respuesta.cuerpo.documento.id as string;
    const [fila] = await consultar<{ factura_anterior_id: string; documento_afectado_id: string | null }>(
      'select factura_anterior_id, documento_afectado_id from libro_de_compras.documentos where id = $1',
      [documentoId],
    );
    expect(fila?.documento_afectado_id).toBeNull();
    expect((await filasDeFacturasAnteriores()).map((f) => f.id)).toEqual([fila?.factura_anterior_id]);
    const [enCuentasPorPagar] = await consultar<{ factura_del_sistema_anterior: boolean }>(
      `select factura_del_sistema_anterior from cuentas_por_pagar.documentos where origen = 'libro_de_compras'
         and documento_id = $1`,
      [documentoId],
    );
    expect(enCuentasPorPagar?.factura_del_sistema_anterior).toBe(true);
  });

  it('una segunda nota con los mismos datos reutiliza la fila; con otros datos se rechaza', async () => {
    const igual = await publicar(RUTA_DOCUMENTOS, nota('NDEB', { fechaEmision: haceDias(1) }));
    expect(igual.estado, JSON.stringify(igual.cuerpo)).toBe(201);
    expect(await filasDeFacturasAnteriores()).toHaveLength(1);

    const distinta = await publicar(RUTA_DOCUMENTOS, nota('NCRE', { facturaAnterior: anterior({ total: '2240.00' }) }));
    expect(distinta.estado).toBe(422);
    expect(distinta.cuerpo.error.codigo).toBe('factura_anterior_con_otros_datos');
  });

  it('registrar una factura con la misma serie y número se rechaza con el camino', async () => {
    const respuesta = await publicar(RUTA_DOCUMENTOS, documentoDePrueba(escenario, { serie: 'B', numero: 'F900' }));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('factura_ya_es_del_sistema_anterior');
    expect(respuesta.cuerpo.error.mensaje).toContain('anule la nota');
  });

  it('con una factura del libro ya registrada se rechaza y se pide elegirla', async () => {
    const factura = await publicar(RUTA_DOCUMENTOS, documentoDePrueba(escenario, { serie: 'C', numero: 'F1' }));
    expect(factura.estado, JSON.stringify(factura.cuerpo)).toBe(201);

    const respuesta = await publicar(
      RUTA_DOCUMENTOS,
      nota('NCRE', { facturaAnterior: anterior({ serie: 'C', numero: 'F1' }) }),
    );

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('factura_anterior_esta_en_el_libro');
  });

  it('las fechas se revisan: factura de la fecha de inicio y nota con las dos facturas', async () => {
    const posterior = await publicar(
      RUTA_DOCUMENTOS,
      nota('NCRE', { facturaAnterior: anterior({ fechaEmision: FECHA_DE_INICIO }) }),
    );
    expect(posterior.cuerpo.error.codigo).toBe('factura_anterior_posterior_a_la_fecha_de_inicio');

    const dos = await publicar(RUTA_DOCUMENTOS, nota('NCRE', { documentoAfectadoId: crypto.randomUUID() }));
    expect(dos.cuerpo.error.codigo).toBe('factura_afectada_incoherente');
  });

  it('«otra causa» a mano en una factura exige el detalle en las observaciones', async () => {
    const sin = await publicar(RUTA_DOCUMENTOS, documentoDePrueba(escenario, { otraCausaSinCredito: true }));
    expect(sin.cuerpo.error.codigo).toBe('otra_causa_sin_detalle');

    const con = await publicar(
      RUTA_DOCUMENTOS,
      documentoDePrueba(escenario, { otraCausaSinCredito: true, observaciones: 'Sin requisitos del art. 18' }),
    );
    expect(con.estado, JSON.stringify(con.cuerpo)).toBe(201);
    expect(con.cuerpo.documento.motivoSinCredito).toBe('otra_causa_sin_credito');
  });
});
