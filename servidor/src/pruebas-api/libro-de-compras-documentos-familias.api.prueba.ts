import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  instalarDestinoFalso,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
const ANTES_DE_LA_DEROGACION = '2025-06-15';
let escenario: EscenarioDeDocumentos;
let contador = 0;
const NOMBRES = [
  'Finca La Esperanza',
  'Granja Los Alamos',
  'Hacienda San Isidro',
  'Apiario Miel de Oro',
  'Cooperativa Cafetalera',
  'Ganadera El Roble',
  'Porcinos del Valle',
  'Avicola Santa Rosa',
  'Hortalizas Frescas',
  'Lecheria El Prado',
  'Vivero Tropical',
  'Cacaotal Verapaz',
  'Maizal Don Pedro',
  'Cardamomo del Norte',
  'Ovinos de Altura',
  'Frutales Atitlan',
  'Pescadores del Lago',
  'Caprinos Oriente',
  'Platanera Costa Sur',
  'Arrocera Motagua',
  'Tabaco Jalapa',
  'Flores de Antigua',
  'Panela Artesanal',
  'Ajonjoli Zacapa',
  'Frijolera Chiquimula',
  'Cañera San Miguel',
];

const propietario = () => escenario.cuenta.propietario;
const linea = (total: string) => ({ conceptoId: escenario.conceptoId, total });

/** Un proveedor nuevo (sin datos fiscales, salvo que se pidan) con su propio NIT. */
async function proveedorNuevo(extra: Record<string, unknown> = {}) {
  const { proveedorId } = await registrarProveedor(escenario.cuenta, NOMBRES[contador]!, extra);
  contador += 1;
  return { proveedorId, nitEmisor: nitValido(String(3000000 + contador)) };
}

const cuerpoDe = (proveedor: { proveedorId: string; nitEmisor: string }, cambios: Record<string, unknown> = {}) =>
  documentoDePrueba(escenario, { ...proveedor, lineas: [linea('5600.00')], ...cambios });

const registrar = (cuerpo: Record<string, unknown>) => propietario().post(RUTA_DOCUMENTOS, cuerpo);

const datosGuardados = (proveedorId: string) =>
  consultar<{ regimen_iva: string }>(
    'select regimen_iva from libro_de_compras.datos_fiscales_de_proveedor where proveedor_id = $1',
    [proveedorId],
  );

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'familiasdocumentos');
  // La empresa retiene IVA e ISR: aun así las familias sin crédito no llevan retenciones.
  await configurarEmpresa(escenario.cuenta, {
    agenteDeRetencionIva: 'contribuyente_especial',
    esAgenteDeRetencionIsr: true,
  });
});

afterAll(() => vi.restoreAllMocks());

describe('primario y pecuario', () => {
  it.each([
    ['FARP', 'primario'],
    ['FCRP', 'primario'],
    ['FPEC', 'pecuario'],
    ['FCPC', 'pecuario'],
  ])(
    '%s: IVA 0, motivo propio, sin retenciones y el régimen del proveedor queda guardado',
    async (tipoDte, regimen) => {
      const proveedor = await proveedorNuevo();

      const respuesta = await registrar(cuerpoDe(proveedor, { tipo: undefined, tipoDte }));

      expect(respuesta.estado).toBe(201);
      expect(respuesta.cuerpo.documento).toMatchObject({
        tipo: 'factura_primario_pecuario',
        tipoDte,
        motivoSinCredito: 'primario_pecuario',
        retenciones: [],
        totales: { total: '5600.00', base: '5600.00', iva: '0.00', ivaNoAcreditable: '0.00' },
      });
      expect(respuesta.cuerpo.avisos).toContain(
        'Productor primario o pecuario: el impuesto lo paga el productor; no se retiene IVA ni ISR.',
      );
      expect(await datosGuardados(proveedor.proveedorId)).toEqual([{ regimen_iva: regimen }]);
    },
  );

  it('no se retiene nada aunque la empresa sea agente de IVA y de ISR', async () => {
    const proveedor = await proveedorNuevo();

    const respuesta = await registrar(cuerpoDe(proveedor, { tipoDte: 'FARP', lineas: [linea('50000.00')] }));

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento.retenciones).toEqual([]);
    expect(respuesta.cuerpo.documento.netoAPagar).toBe('50000.00');
  });

  it('no existe antes del 2025-04-09', async () => {
    const proveedor = await proveedorNuevo();

    const antes = await registrar(cuerpoDe(proveedor, { tipoDte: 'FARP', fechaEmision: '2025-04-08' }));

    expect(antes.estado).toBe(422);
    expect(antes.cuerpo.error.codigo).toBe('familia_aun_no_vigente');
  });
});

describe('familias derogadas', () => {
  it.each([
    ['FAPE', 'factura_pequeno_contribuyente_electronico', 'pequeno_contribuyente'],
    ['FCPE', 'factura_pequeno_contribuyente_electronico', 'pequeno_contribuyente'],
    ['FACA', 'factura_contribuyente_agropecuario', 'contribuyente_agropecuario'],
    ['FAAE', 'factura_contribuyente_agropecuario', 'contribuyente_agropecuario'],
  ])('%s anterior a la derogación: IVA 0, su motivo y sin guardar su régimen', async (tipoDte, tipo, motivo) => {
    const proveedor = await proveedorNuevo();
    const cuerpo = cuerpoDe(proveedor, {
      tipoDte,
      fechaEmision: ANTES_DE_LA_DEROGACION,
      fechaRecepcion: ANTES_DE_LA_DEROGACION,
    });

    const respuesta = await registrar(cuerpo);

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento).toMatchObject({
      tipo,
      tipoDte,
      motivoSinCredito: motivo,
      retenciones: [],
      totales: { iva: '0.00' },
    });
    expect(await datosGuardados(proveedor.proveedorId)).toEqual([]);
  });

  it('emitidas desde la fecha de derogación se rechazan, al calcular y al registrar', async () => {
    const proveedor = await proveedorNuevo();
    const cuerpo = cuerpoDe(proveedor, { tipoDte: 'FAPE', fechaEmision: '2025-07-09', fechaRecepcion: '2025-07-09' });

    const calculo = await propietario().post(`${RUTA_DOCUMENTOS}/calcular`, cuerpo);
    const registro = await registrar(cuerpo);

    for (const respuesta of [calculo, registro]) {
      expect(respuesta.estado).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('familia_derogada');
    }
  });

  it('la nota de crédito de hoy sobre una factura derogada vale: se mide la fecha de la factura', async () => {
    const proveedor = await proveedorNuevo();
    const factura = await registrar(
      cuerpoDe(proveedor, {
        tipoDte: 'FACA',
        fechaEmision: ANTES_DE_LA_DEROGACION,
        fechaRecepcion: ANTES_DE_LA_DEROGACION,
      }),
    );

    const nota = await registrar(
      cuerpoDe(proveedor, {
        tipo: 'nota_de_credito',
        serie: 'N',
        documentoAfectadoId: factura.cuerpo.documento.id,
        lineas: [linea('560.00')],
      }),
    );

    expect(nota.estado).toBe(201);
    expect(nota.cuerpo.documento).toMatchObject({
      tipoDte: 'NCRE',
      motivoSinCredito: 'contribuyente_agropecuario',
      totales: { iva: '0.00' },
    });
  });
});

describe('tipo de documento y código de la SAT', () => {
  it('con FEL el código es obligatorio, aunque llegue la familia', async () => {
    const proveedor = await proveedorNuevo();

    const respuesta = await registrar(cuerpoDe(proveedor, { tipoDte: null, tipo: 'factura_primario_pecuario' }));

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('tipo_dte_obligatorio');
  });

  it('la familia que llega debe coincidir con la del código', async () => {
    const proveedor = await proveedorNuevo();

    const respuesta = await registrar(cuerpoDe(proveedor, { tipo: 'factura', tipoDte: 'FARP' }));

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('tipo_dte_incoherente');
  });

  it('sin FEL no se escribe el código, y sin código ni familia no hay documento', async () => {
    const proveedor = await proveedorNuevo();

    const sinFel = await registrar(cuerpoDe(proveedor, { autorizacionFel: null, tipoDte: 'FACT' }));
    const sinTipo = await registrar(cuerpoDe(proveedor, { tipo: undefined, tipoDte: null }));

    expect(sinFel.cuerpo.error.codigo).toBe('tipo_dte_sin_fel');
    expect(sinTipo.cuerpo.error.codigo).toBe('tipo_de_documento_obligatorio');
  });

  it('un código que no existe lo rechaza el esquema', async () => {
    const proveedor = await proveedorNuevo();

    const respuesta = await registrar(cuerpoDe(proveedor, { tipoDte: 'XXXX' }));

    expect(respuesta.estado).toBe(400);
  });

  it('la lista y la ficha traen el código', async () => {
    const proveedor = await proveedorNuevo();
    const creada = await registrar(cuerpoDe(proveedor, { tipoDte: 'FCAM' }));

    const ficha = await propietario().get(`${RUTA_DOCUMENTOS}/${creada.cuerpo.documento.id}`);
    const lista = await propietario().get(`${RUTA_DOCUMENTOS}?proveedorId=${proveedor.proveedorId}`);

    expect(ficha.cuerpo).toMatchObject({ tipo: 'factura', tipoDte: 'FCAM', motivoDeLaFactura: null });
    expect(lista.cuerpo.elementos).toEqual([expect.objectContaining({ tipoDte: 'FCAM' })]);
  });
});
