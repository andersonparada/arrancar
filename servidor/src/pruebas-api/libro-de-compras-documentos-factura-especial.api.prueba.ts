import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { EMISION_DE_PRUEBA, VendedoresDePrueba } from './soporte/factura-especial.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  instalarDestinoFalso,
  nitValido,
  NIT_DE_LA_EMPRESA,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
const EMISION = EMISION_DE_PRUEBA;
const CUI = '1234567890101';
let escenario: EscenarioDeDocumentos;
let vendedores: VendedoresDePrueba;

const propietario = () => escenario.cuenta.propietario;
const registrar = (proveedorId: string, cambios: Record<string, unknown> = {}) =>
  propietario().post(RUTA_DOCUMENTOS, vendedores.cuerpo(proveedorId, cambios));
const fichaDelTercero = (terceroId: string) => vendedores.ficha(terceroId);

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'facturaespecial');
  vendedores = new VendedoresDePrueba(escenario);
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: true,
  });
});

afterAll(() => vi.restoreAllMocks());

describe('factura especial: vendedor por NIT', () => {
  it('emite la empresa, el vendedor va en el receptor y se le completa el NIT', async () => {
    const vendedor = await vendedores.nuevo();
    const nit = nitValido('4100001');

    const respuesta = await registrar(vendedor.proveedorId, { nitReceptor: nit });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento).toMatchObject({
      tipo: 'factura_especial',
      tipoDte: 'FESP',
      nitEmisor: NIT_DE_LA_EMPRESA,
      nitReceptor: nit,
      nombreEmisor: vendedor.nombre,
      motivoSinCredito: null,
      fechaRecepcion: EMISION,
    });
    expect((await fichaDelTercero(vendedor.terceroId)).nit).toBe(nit);
    expect(respuesta.cuerpo.avisos).toContain(
      'Si compra productos agropecuarios a un productor del régimen primario o pecuario, puede corresponder la factura específica (FEPE).',
    );
    expect(respuesta.cuerpo.avisos.join(' ')).not.toContain('contribuyentes del IVA');
  });

  it('retiene el 100 % del IVA y el 5 % del valor sin IVA, los dos con la fecha de emisión', async () => {
    const vendedor = await vendedores.nuevo();

    const respuesta = await registrar(vendedor.proveedorId, { nitReceptor: nitValido('4100002') });

    const reglas = Object.fromEntries(
      respuesta.cuerpo.documento.retenciones.map((r: { regla: string }) => [r.regla, r]),
    );
    expect(reglas.iva_factura_especial).toMatchObject({
      impuesto: 'iva',
      base: '600.00',
      porcentaje: '100.00',
      monto: '600.00',
      fecha: EMISION,
    });
    expect(reglas.isr_factura_especial).toMatchObject({
      impuesto: 'isr',
      base: '5000.00',
      porcentaje: '5.00',
      monto: '250.00',
      fecha: EMISION,
    });
    expect(respuesta.cuerpo.documento.netoAPagar).toBe('4750.00');
    const guardadas = await consultar<{ regla: string; fecha: string }>(
      `select regla, to_char(fecha, 'YYYY-MM-DD') as fecha from libro_de_compras.retenciones where documento_id = $1`,
      [respuesta.cuerpo.documento.id],
    );
    expect(guardadas.map((r) => r.fecha)).toEqual([EMISION, EMISION]);
  });

  it('guarda al proveedor sin inscripción en el IVA', async () => {
    const vendedor = await vendedores.nuevo();

    await registrar(vendedor.proveedorId, { nitReceptor: nitValido('4100003') });

    const datos = await consultar<{ regimen_iva: string }>(
      'select regimen_iva from libro_de_compras.datos_fiscales_de_proveedor where proveedor_id = $1',
      [vendedor.proveedorId],
    );
    expect(datos).toEqual([{ regimen_iva: 'sin_inscripcion' }]);
  });

  it('con el NIT ya guardado, el vendedor debe coincidir', async () => {
    const nit = nitValido('4100004');
    const vendedor = await vendedores.nuevo({ nit });

    const bien = await registrar(vendedor.proveedorId, { nitReceptor: nit });
    const otro = await registrar(vendedor.proveedorId, { nitReceptor: nitValido('4100005'), numero: '999' });

    expect(bien.estado).toBe(201);
    expect(otro.estado).toBe(422);
    expect(otro.cuerpo.error.codigo).toBe('vendedor_no_coincide');
  });
});

describe('factura especial: vendedor por CUI', () => {
  it('se completa el DPI del proveedor que no lo tiene', async () => {
    const vendedor = await vendedores.nuevo();

    const respuesta = await registrar(vendedor.proveedorId, { nitReceptor: CUI });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento).toMatchObject({ nitEmisor: NIT_DE_LA_EMPRESA, nitReceptor: CUI });
    expect(await fichaDelTercero(vendedor.terceroId)).toMatchObject({ dpi: CUI, nit: null });
  });

  it('con el DPI ya guardado coincide sin cambiarlo', async () => {
    const vendedor = await vendedores.nuevo({ dpi: '2345678130101' });

    const respuesta = await registrar(vendedor.proveedorId, { nitReceptor: '2345 67813 0101' });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento.nitReceptor).toBe('2345678130101');
  });

  it('un CUI que ya es de otro tercero de la cuenta rechaza el registro entero', async () => {
    const vendedor = await vendedores.nuevo();

    const respuesta = await registrar(vendedor.proveedorId, { nitReceptor: CUI });

    expect(respuesta.estado).toBe(409);
    const documentos = await consultar<{ id: string }>(
      'select id from libro_de_compras.documentos where proveedor_id = $1',
      [vendedor.proveedorId],
    );
    expect(documentos).toEqual([]);
  });
});

describe('factura especial: lo que se rechaza', () => {
  it.each([
    ['consumidor final', { nitReceptor: 'CF' }, 'vendedor_de_factura_especial_invalido'],
    ['sin vendedor', { nitReceptor: null }, 'vendedor_de_factura_especial_invalido'],
    ['la propia empresa', { nitReceptor: NIT_DE_LA_EMPRESA }, 'vendedor_de_factura_especial_invalido'],
    ['un NIT o CUI inválido', { nitReceptor: '123' }, 'receptor_invalido'],
    ['sin serie', { nitReceptor: nitValido('4100006'), serie: null }, 'datos_de_la_fel_incompletos'],
    [
      'fuera del libro',
      { nitReceptor: nitValido('4100006'), motivoFueraDelLibro: 'fel_a_otro_nit' },
      'factura_especial_siempre_en_el_libro',
    ],
  ])('%s', async (_nombre, cambios, codigo) => {
    const vendedor = await vendedores.nuevo();

    const respuesta = await registrar(vendedor.proveedorId, cambios);

    expect(respuesta.cuerpo.error.codigo).toBe(codigo);
    expect(respuesta.estado).toBeGreaterThanOrEqual(400);
    expect(respuesta.estado).toBeLessThan(500);
  });

  it('una nota de crédito no rebaja una factura especial', async () => {
    const vendedor = await vendedores.nuevo();
    const creada = await registrar(vendedor.proveedorId, { nitReceptor: nitValido('4100007') });

    const nota = await propietario().post(
      RUTA_DOCUMENTOS,
      documentoDePrueba(escenario, {
        tipo: 'nota_de_credito',
        proveedorId: vendedor.proveedorId,
        nitEmisor: nitValido('4100007'),
        documentoAfectadoId: creada.cuerpo.documento.id,
        fechaEmision: EMISION,
        lineas: [{ conceptoId: escenario.conceptoId, total: '112.00' }],
      }),
    );

    expect(nota.estado).toBe(422);
    expect(nota.cuerpo.error.codigo).toBe('nota_sobre_factura_especial');
    expect(nota.cuerpo.error.mensaje).toBe(
      'Una factura especial no se rebaja con nota de crédito en Arrancar: anule la factura especial en su certificador, anule este registro y registre la nueva.',
    );
  });
});

describe('factura especial: nota de débito', () => {
  it('una nota de débito no aumenta una factura especial', async () => {
    const vendedor = await vendedores.nuevo();
    const creada = await registrar(vendedor.proveedorId, { nitReceptor: nitValido('4100099') });

    const nota = await propietario().post(
      RUTA_DOCUMENTOS,
      documentoDePrueba(escenario, {
        tipoDte: 'NDEB',
        proveedorId: vendedor.proveedorId,
        nitEmisor: nitValido('4100099'),
        documentoAfectadoId: creada.cuerpo.documento.id,
        fechaEmision: EMISION,
        lineas: [{ conceptoId: escenario.conceptoId, total: '112.00' }],
      }),
    );

    expect(nota.estado).toBe(422);
    expect(nota.cuerpo.error.codigo).toBe('nota_sobre_factura_especial');
  });
});

describe('factura especial: avisos', () => {
  it('a un proveedor inscrito en el IVA avisa el artículo 52', async () => {
    const nit = nitValido('4100008');
    const vendedor = await vendedores.nuevo({ nit }, { regimenIva: 'general', regimenIsr: 'utilidades' });

    const respuesta = await registrar(vendedor.proveedorId, { nitReceptor: nit });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.avisos).toContain(
      'No se emite factura especial entre contribuyentes del IVA, salvo que conste la negativa del vendedor a facturar (Ley del IVA art. 52).',
    );
  });

  it('la vista previa trae los mismos avisos y retenciones sin guardar nada', async () => {
    const vendedor = await vendedores.nuevo();

    const previa = await propietario().post(
      `${RUTA_DOCUMENTOS}/calcular`,
      vendedores.cuerpo(vendedor.proveedorId, { nitReceptor: nitValido('4100009') }),
    );

    expect(previa.estado).toBe(200);
    expect(previa.cuerpo.documento.retenciones.map((r: { regla: string }) => r.regla)).toEqual([
      'iva_factura_especial',
      'isr_factura_especial',
    ]);
    expect((await fichaDelTercero(vendedor.terceroId)).nit).toBeNull();
  });

  it('anular la factura especial permite registrarla de nuevo sin retener otra vez', async () => {
    const vendedor = await vendedores.nuevo();
    const cuerpo = {
      nitReceptor: nitValido('4100010'),
      serie: 'FE',
      numero: '77',
      autorizacionFel: crypto.randomUUID(),
    };
    const primera = await registrar(vendedor.proveedorId, cuerpo);
    await propietario().post(`${RUTA_DOCUMENTOS}/${primera.cuerpo.documento.id}/anular`, {
      causa: 'fel_anulada_por_el_emisor',
      motivo: 'La empresa anuló la FESP en su certificador',
    });

    const segunda = await registrar(vendedor.proveedorId, cuerpo);

    expect(segunda.estado).toBe(201);
    expect(segunda.cuerpo.documento.retenciones.map((r: { monto: string }) => r.monto)).toEqual(['0.00', '0.00']);
  });
});
