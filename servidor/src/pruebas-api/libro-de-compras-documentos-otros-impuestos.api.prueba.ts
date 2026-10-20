import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  documentoDePrueba,
  instalarDestinoFalso,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;

const propietario = () => escenario.cuenta.propietario;
const registrar = (linea: Record<string, unknown>) =>
  propietario().post(
    RUTA_DOCUMENTOS,
    documentoDePrueba(escenario, { lineas: [{ conceptoId: escenario.conceptoId, ...linea }] }),
  );
const conCombustible = (linea: Record<string, unknown>) =>
  registrar({ combustibleId: escenario.combustibleId, ...linea });

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'otrosimpuestos');
});

afterAll(() => vi.restoreAllMocks());

describe('otros impuestos de la línea', () => {
  it('una factura de luz con tasa municipal: el IVA y la base salen sin ella, y va al costo', async () => {
    const respuesta = await registrar({ total: '1270.00', otrosImpuestos: '150.00' });

    expect(respuesta.estado).toBe(201);
    const { documento } = respuesta.cuerpo;
    expect(documento.motivoSinCredito).toBeNull();
    expect(documento.totales).toMatchObject({
      total: '1270.00',
      base: '1000.00',
      iva: '120.00',
      otrosImpuestos: '150.00',
    });
    expect(documento.lineas[0]).toMatchObject({ otrosImpuestos: '150.00', base: '1000.00', costo: '1150.00' });
    const [guardado] = await consultar('select otros_impuestos from libro_de_compras.documentos where id = $1', [
      documento.id,
    ]);
    expect(guardado).toMatchObject({ otros_impuestos: '150.00' });
  });

  it('la ficha trae los otros impuestos de la línea y del documento', async () => {
    const { cuerpo } = await registrar({ total: '1270.00', otrosImpuestos: '150.00' });

    const ficha = await propietario().get(`${RUTA_DOCUMENTOS}/${cuerpo.documento.id}`);

    expect(ficha.cuerpo.totales.otrosImpuestos).toBe('150.00');
    expect(ficha.cuerpo.lineas[0].otrosImpuestos).toBe('150.00');
  });

  it('todo exento más otros impuestos es exento; solo otros impuestos no lo es', async () => {
    const exento = await registrar({ total: '550.00', exento: '500.00', otrosImpuestos: '50.00' });
    const soloOtros = await registrar({ total: '50.00', otrosImpuestos: '50.00' });

    expect(exento.cuerpo.documento.motivoSinCredito).toBe('exento');
    expect(soloOtros.estado).toBe(201);
    expect(soloOtros.cuerpo.documento.motivoSinCredito).toBeNull();
  });

  it('la vista previa los calcula igual', async () => {
    const solicitud = documentoDePrueba(escenario, {
      lineas: [{ conceptoId: escenario.conceptoId, total: '1270.00', otrosImpuestos: '150.00' }],
    });

    const previa = await propietario().post(`${RUTA_DOCUMENTOS}/calcular`, solicitud);

    expect(previa.estado).toBe(200);
    expect(previa.cuerpo.documento.totales).toMatchObject({ base: '1000.00', otrosImpuestos: '150.00' });
  });

  it('rechaza otros impuestos que pasan del total', async () => {
    const respuesta = await registrar({ total: '100.00', otrosImpuestos: '100.01' });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('linea_invalida');
  });
});

describe('IDP escrito', () => {
  it('un combustible con el IDP escrito y sin galones guarda el IDP tal cual', async () => {
    const respuesta = await registrar({ total: '1000.00', idpEscrito: '423.00' });

    expect(respuesta.estado).toBe(201);
    const [linea] = respuesta.cuerpo.documento.lineas;
    expect(linea).toMatchObject({ idp: '423.00', idpEscrito: true, tipo: 'bien', combustible: null });
    expect(respuesta.cuerpo.avisos).toEqual([]);
  });

  it('sin galones ni IDP escrito, el combustible sigue exigiendo los galones', async () => {
    const respuesta = await conCombustible({ total: '500.00' });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('linea_de_documento_invalida');
  });

  it('sin tasa en la fecha: error si el IDP se calcula, aviso si es escrito', async () => {
    const calculado = await conCombustible({ total: '500.00', galones: '10' });
    const escrito = await conCombustible({ total: '500.00', galones: '10', idpEscrito: '47.00' });

    expect(calculado.estado).toBe(422);
    expect(calculado.cuerpo.error.codigo).toBe('combustible_sin_tasa_vigente');
    expect(escrito.estado).toBe(201);
    expect(escrito.cuerpo.documento.lineas[0]).toMatchObject({ idp: '47.00', idpEscrito: true, combustible: null });
    expect(escrito.cuerpo.avisos.join(' ')).toContain('no se comprobó el IDP');
  });

  it('con tasa vigente se compara con los galones y avisa si no coincide', async () => {
    const vigencia = await propietario().post('/api/libro-de-compras/vigencias-de-combustible', {
      combustibleId: escenario.combustibleId,
      idpPorGalon: '4.70',
      porcentajeDeEtanol: '0.00',
      vigenteDesde: '2026-01-01',
      vigenteHasta: null,
    });
    expect(vigencia.estado).toBe(201);

    const coincide = await conCombustible({ total: '500.00', galones: '10', idpEscrito: '47.00' });
    const distinto = await conCombustible({ total: '500.00', galones: '10', idpEscrito: '40.00' });
    const calculado = await conCombustible({ total: '500.00', galones: '10' });

    expect(coincide.cuerpo.avisos).toEqual([]);
    expect(distinto.estado).toBe(201);
    expect(distinto.cuerpo.documento.lineas[0]).toMatchObject({ idp: '40.00', idpEscrito: true });
    expect(distinto.cuerpo.documento.lineas[0].combustible).toMatchObject({ galones: '10', idpPorGalon: '4.70' });
    expect(distinto.cuerpo.avisos).toEqual([
      'El IDP de la factura (Q 40.00) no coincide con el de 10 galones de Diésel (Q 47.00): revise los galones o el IDP.',
    ]);
    expect(calculado.cuerpo.documento.lineas[0]).toMatchObject({ idp: '47.00', idpEscrito: false });
  });

  it('rechaza un IDP escrito en una línea de servicio', async () => {
    const respuesta = await registrar({ total: '500.00', idpEscrito: '47.00', tipo: 'servicio' });

    expect(respuesta.estado).toBe(400);
  });
});
