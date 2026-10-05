import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  documentoDePrueba,
  haceDias,
  instalarDestinoFalso,
  NIT_DE_LA_EMPRESA,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;

const registrar = (cambios: Record<string, unknown> = {}) =>
  escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, documentoDePrueba(escenario, cambios));

const linea = (total: string, exento?: string) => ({ conceptoId: escenario.conceptoId, total, exento });

/** La factura de Q1,120.00 con IVA al proveedor del escenario: la que rebajan las notas de los casos. */
async function registrarFactura(lineas = [linea('1120.00')]) {
  const factura = await registrar({ lineas });
  expect(factura.estado).toBe(201);
  return factura.cuerpo.documento.id as string;
}

const nota = (facturaId: string, lineas: unknown[]) =>
  registrar({ tipo: 'nota_de_credito', documentoAfectadoId: facturaId, serie: 'N', lineas });

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'fiscaldocumentos');
});

afterAll(() => vi.restoreAllMocks());

describe('notas de crédito', () => {
  it('una nota con IVA contra una factura exenta se rechaza, y una exenta se acepta', async () => {
    const exenta = await registrarFactura([linea('500.00', '500.00')]);

    const conIva = await nota(exenta, [linea('112.00')]);
    const sinIva = await nota(exenta, [linea('100.00', '100.00')]);

    expect(conIva.estado).toBe(422);
    expect(conIva.cuerpo.error.codigo).toBe('nota_con_iva_de_factura_exenta');
    expect(sinIva.estado).toBe(201);
    expect(sinIva.cuerpo.documento).toMatchObject({ motivoSinCredito: 'exento', documentoAfectadoId: exenta });
  });

  it('las notas vigentes no pueden sumar más que el total ni más IVA que la factura', async () => {
    const factura = await registrarFactura([linea('560.00'), linea('560.00', '560.00')]);

    const masIva = await nota(factura, [linea('1120.00')]);
    const primera = await nota(factura, [linea('1000.00', '1000.00')]);
    const pasaDelTotal = await nota(factura, [linea('200.00', '200.00')]);

    expect(masIva.cuerpo.error.codigo).toBe('iva_de_notas_excede_el_de_la_factura');
    expect(primera.estado).toBe(201);
    expect(pasaDelTotal.cuerpo.error.codigo).toBe('nota_supera_la_factura');
  });

  it('la nota debe ser del mismo proveedor y no puede faltarle la factura', async () => {
    const factura = await registrarFactura();
    const { proveedorId: otro } = await registrarProveedor(escenario.cuenta, 'Otro proveedor');

    const deOtro = await registrar({
      tipo: 'nota_de_credito',
      documentoAfectadoId: factura,
      proveedorId: otro,
      nitEmisor: nitValido('4455661'),
      serie: 'N',
    });
    const sinFactura = await registrar({ tipo: 'nota_de_credito', serie: 'N' });

    expect(deOtro.cuerpo.error.codigo).toBe('factura_no_sirve_para_la_nota');
    expect(sinFactura.cuerpo.error.codigo).toBe('factura_afectada_incoherente');
  });
});

describe('casilla «Se muestra en reportes SAT»', () => {
  it('una FEL emitida al NIT de la empresa no se desmarca', async () => {
    const respuesta = await registrar({
      motivoFueraDelLibro: 'fel_a_otro_nit',
      nitReceptor: NIT_DE_LA_EMPRESA,
      lineas: [linea('5600.00')],
    });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('fel_al_nit_de_la_empresa_no_se_desmarca');
  });

  it('una FEL a otro NIT, sin decir a quién, se rechaza; con el NIT de otro queda fuera del libro con avisos', async () => {
    const sinReceptor = await registrar({ motivoFueraDelLibro: 'fel_a_otro_nit' });
    const fuera = await registrar({ motivoFueraDelLibro: 'fel_a_otro_nit', nitReceptor: nitValido('9988771') });

    expect(sinReceptor.cuerpo.error.codigo).toBe('motivo_fuera_del_libro_incoherente');
    expect(fuera.estado).toBe(201);
    expect(fuera.cuerpo.documento).toMatchObject({
      muestraEnReportesSat: false,
      motivoSinCredito: null,
      retenciones: [],
    });
    expect(fuera.cuerpo.documento.totales.iva).toBe('0.00');
    expect(fuera.cuerpo.avisos.join(' ')).toContain('no es deducible');
  });

  it('un recibo no va en el libro, y una factura de pequeño contribuyente exige a ese proveedor', async () => {
    const recibo = await registrar({ tipo: 'recibo' });
    const pequeno = await registrar({ tipo: 'factura_pequeno_contribuyente' });

    expect(recibo.cuerpo.error.codigo).toBe('recibo_debe_quedar_fuera_del_libro');
    expect(pequeno.cuerpo.error.codigo).toBe('tipo_no_corresponde_al_proveedor');
  });
});

describe('combustible', () => {
  async function combustibleConTasa(nombre: string, vigenteHasta: string | null) {
    const combustible = await escenario.cuenta.propietario.post('/api/libro-de-compras/combustibles', {
      nombre,
      activo: true,
    });
    await escenario.cuenta.propietario.post('/api/libro-de-compras/vigencias-de-combustible', {
      combustibleId: combustible.cuerpo.id,
      idpPorGalon: '4.70',
      porcentajeDeEtanol: '10.00',
      vigenteDesde: '2020-01-01',
      vigenteHasta,
    });
    return combustible.cuerpo.id as string;
  }

  it('toma la tasa vigente a la fecha de emisión y la guarda en la línea', async () => {
    const regular = await combustibleConTasa('Regular', null);

    const respuesta = await registrar({
      lineas: [{ conceptoId: escenario.conceptoId, total: '500.00', combustibleId: regular, galones: '10.000' }],
    });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento.lineas[0]).toMatchObject({
      idp: '42.30',
      combustible: { galones: '10.000', idpPorGalon: '4.70', porcentajeDeEtanol: '10.00' },
    });
  });

  it('sin tasa vigente en la fecha de emisión se rechaza, y no queda nada', async () => {
    const vencido = await combustibleConTasa('Super', '2020-12-31');

    const respuesta = await registrar({
      numero: 'SIN-TASA',
      lineas: [{ conceptoId: escenario.conceptoId, total: '500.00', combustibleId: vencido, galones: '10' }],
    });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('combustible_sin_tasa_vigente');
    expect(await consultar("select id from libro_de_compras.documentos where numero = 'SIN-TASA'")).toHaveLength(0);
  });
});

describe('períodos y avisos', () => {
  it('propone el mes de recepción y avisa que el período puede estar declarado', async () => {
    const recepcion = haceDias(100);

    const respuesta = await registrar({ fechaEmision: recepcion, fechaRecepcion: recepcion });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento.periodo).toBe(`${recepcion.slice(0, 7)}-01`);
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('puede estar declarado');
  });
});
