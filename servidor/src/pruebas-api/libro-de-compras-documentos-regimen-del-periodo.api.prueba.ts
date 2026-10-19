import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  documentoDePrueba,
  instalarDestinoFalso,
  NIT_DE_LA_EMPRESA,
  prepararEscenario,
  primerDiaDelMes,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;

const propietario = () => escenario.cuenta.propietario;
const MES_PASADO = primerDiaDelMes(-1);
const ESTE_MES = primerDiaDelMes(0);
const DEL_MES_PASADO = { fechaEmision: MES_PASADO, fechaRecepcion: MES_PASADO };
const registrar = (cambios: Record<string, unknown> = {}) =>
  propietario().post(RUTA_DOCUMENTOS, documentoDePrueba(escenario, cambios));

/** La foto del régimen y el motivo que quedaron guardados. */
async function guardado(id: string) {
  const [fila] = await consultar<{ regimen_iva_de_la_empresa: string; motivo_sin_credito: string | null }>(
    'select regimen_iva_de_la_empresa, motivo_sin_credito from libro_de_compras.documentos where id = $1',
    [id],
  );
  return fila!;
}

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'regimendelperiodo');
});

afterAll(() => vi.restoreAllMocks());

describe('cada documento toma el régimen de su período', () => {
  let facturaAntes: string;

  it('antes del cambio la factura se registra con el régimen general y da crédito', async () => {
    const respuesta = await registrar(DEL_MES_PASADO);

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento).toMatchObject({ regimenIvaDeLaEmpresa: 'general', motivoSinCredito: null });
    facturaAntes = respuesta.cuerpo.documento.id;
    expect(await guardado(facturaAntes)).toMatchObject({ regimen_iva_de_la_empresa: 'general' });
  });

  it('la empresa cambia de régimen a partir de este mes y las facturas posteriores toman el nuevo', async () => {
    const cambio = await propietario().put(`/api/empresas/${escenario.cuenta.empresaId}`, {
      nombre: 'Rancho fiscal',
      nit: NIT_DE_LA_EMPRESA,
      secciones: {
        'libro-de-compras': {
          tipoDePersona: 'juridica',
          regimenIva: 'pequeno_contribuyente',
          agenteDeRetencionIva: 'ninguno',
          vigenteDesde: ESTE_MES,
        },
      },
    });
    expect(cambio.estado).toBe(200);

    const despues = await registrar();
    const otraDelPasado = await registrar(DEL_MES_PASADO);

    expect(despues.cuerpo.documento).toMatchObject({
      regimenIvaDeLaEmpresa: 'pequeno_contribuyente',
      motivoSinCredito: 'empresa_sin_credito',
    });
    expect(despues.cuerpo.documento.totales.ivaNoAcreditable).toBe(despues.cuerpo.documento.totales.iva);
    expect(otraDelPasado.cuerpo.documento).toMatchObject({ regimenIvaDeLaEmpresa: 'general', motivoSinCredito: null });
    expect(await guardado(despues.cuerpo.documento.id)).toMatchObject({
      regimen_iva_de_la_empresa: 'pequeno_contribuyente',
      motivo_sin_credito: 'empresa_sin_credito',
    });
  });

  it('la ficha y la lista muestran el régimen con que se registró cada una', async () => {
    const ficha = await propietario().get(`${RUTA_DOCUMENTOS}/${facturaAntes}`);
    const lista = await propietario().get(`${RUTA_DOCUMENTOS}?limite=50`);

    expect(ficha.cuerpo.regimenIvaDeLaEmpresa).toBe('general');
    const regimenes = new Set(
      lista.cuerpo.elementos.map((fila: { regimenIvaDeLaEmpresa: string }) => fila.regimenIvaDeLaEmpresa),
    );
    expect(regimenes).toEqual(new Set(['general', 'pequeno_contribuyente']));
  });

  it('una nota que cae después del cambio, de una factura con crédito, lleva empresa_sin_credito y avisa', async () => {
    const nota = await registrar({
      tipo: 'nota_de_credito',
      documentoAfectadoId: facturaAntes,
      serie: 'N',
      lineas: [{ conceptoId: escenario.conceptoId, total: '112.00' }],
    });

    expect(nota.estado).toBe(201);
    expect(nota.cuerpo.documento).toMatchObject({
      regimenIvaDeLaEmpresa: 'pequeno_contribuyente',
      motivoSinCredito: 'empresa_sin_credito',
    });
    expect(nota.cuerpo.avisos).toContain('La factura dio crédito en el régimen anterior; consulte a su contador.');
  });
});

describe('el registro y el cambio de régimen no se pisan', () => {
  it('registrar espera mientras el historial fiscal está bloqueado; la vista previa no', async () => {
    const bloqueador = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
    await bloqueador.connect();
    await bloqueador.query('begin');
    await bloqueador.query('lock table libro_de_compras.datos_fiscales_de_empresa in exclusive mode');
    try {
      const documento = documentoDePrueba(escenario, DEL_MES_PASADO);
      const calculada = await propietario().post(`${RUTA_DOCUMENTOS}/calcular`, documento);
      let terminado = false;
      const registro = propietario()
        .post(RUTA_DOCUMENTOS, documento)
        .finally(() => (terminado = true));
      await new Promise((resolver) => setTimeout(resolver, 700));

      expect(calculada.estado).toBe(200);
      expect(terminado).toBe(false);
      await bloqueador.query('commit');
      expect((await registro).estado).toBe(201);
    } finally {
      await bloqueador.end();
    }
  });
});
