import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { VendedoresDePrueba } from './soporte/factura-especial.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  instalarDestinoFalso,
  NIT_DE_LA_EMPRESA,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
const AVISO_DE_DONACION =
  'Donación: deducible solo en el ISR sobre utilidades, a entidades autorizadas y con límite anual; no es una compra.';
let escenario: EscenarioDeDocumentos;
let contador = 0;
const NOMBRES = ['Fundación Esperanza', 'Fundación Manos Unidas', 'Asociación Luz del Norte', 'Comité Pro Mejoras'];

const propietario = () => escenario.cuenta.propietario;

/** Un recibo FEL al NIT de la empresa: sin NIT ni serie del emisor, con su código y su autorización. */
async function registrarRecibo(cambios: Record<string, unknown> = {}) {
  contador += 1;
  const { proveedorId } = await registrarProveedor(escenario.cuenta, NOMBRES[contador - 1]!);
  return propietario().post(
    RUTA_DOCUMENTOS,
    documentoDePrueba(escenario, {
      proveedorId,
      tipo: 'recibo',
      tipoDte: 'RECI',
      motivoFueraDelLibro: 'recibo_fel',
      nitEmisor: null,
      serie: null,
      datosFiscalesDelProveedor: null,
      ...cambios,
    }),
  );
}

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'recibofel');
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: true,
  });
});

afterAll(() => vi.restoreAllMocks());

describe('recibo FEL a la empresa', () => {
  it('un RECI queda fuera del libro, con el NIT de la empresa, sin IVA ni retenciones y sin avisos de donación', async () => {
    const respuesta = await registrarRecibo({ nitReceptor: NIT_DE_LA_EMPRESA });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento).toMatchObject({
      tipo: 'recibo',
      tipoDte: 'RECI',
      muestraEnReportesSat: false,
      motivoFueraDelLibro: 'recibo_fel',
      nitReceptor: NIT_DE_LA_EMPRESA,
      motivoSinCredito: null,
      retenciones: [],
    });
    expect(respuesta.cuerpo.avisos).not.toContain(AVISO_DE_DONACION);
  });

  it('un RDON también, y avisa que la donación solo es deducible en el ISR sobre utilidades', async () => {
    const respuesta = await registrarRecibo({ tipoDte: 'RDON' });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento).toMatchObject({ tipoDte: 'RDON', motivoFueraDelLibro: 'recibo_fel' });
    expect(respuesta.cuerpo.avisos).toContain(AVISO_DE_DONACION);
  });

  it('un RECI a un NIT ajeno es un error y no se guarda', async () => {
    const autorizacion = crypto.randomUUID();

    const respuesta = await registrarRecibo({ nitReceptor: nitValido('9100001'), autorizacionFel: autorizacion });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('recibo_fel_incoherente');
    const guardados = await consultar('select 1 from libro_de_compras.documentos where autorizacion_fel = $1', [
      autorizacion,
    ]);
    expect(guardados).toHaveLength(0);
  });

  it('el motivo recibo_fel no vale para una factura', async () => {
    const respuesta = await registrarRecibo({ tipo: 'factura', tipoDte: 'FACT' });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('recibo_fel_incoherente');
  });
});

describe('factura especial sin otros impuestos ni IDP', () => {
  it('con otros impuestos en una línea se rechaza', async () => {
    const vendedores = new VendedoresDePrueba(escenario);
    const vendedor = await vendedores.nuevo();
    const lineas = [{ conceptoId: escenario.conceptoId, total: '5600.00', otrosImpuestos: '100.00' }];

    const respuesta = await propietario().post(
      RUTA_DOCUMENTOS,
      vendedores.cuerpo(vendedor.proveedorId, { nitReceptor: nitValido('9200001'), lineas }),
    );

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('factura_especial_sin_otros_impuestos');
    expect(respuesta.cuerpo.error.mensaje).toBe('Una factura especial no lleva otros impuestos ni IDP.');
  });
});
