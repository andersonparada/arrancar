import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, nitValido, registrarProveedor } from './soporte/escenario-de-documentos.js';
import {
  filaGuardada,
  prepararBandejaGeneral,
  RUTA_DTE,
  type BandejaGeneral,
  type CambiosDeLaFila,
} from './soporte/escenario-de-bandeja.js';
import { mesDe } from './soporte/escenario-de-periodos.js';

const entorno = usarEntornoApi();
const NIT_DEL_PROVEEDOR = nitValido('4500001');
const MARCA = 'Montos del resumen de la SAT (una sola línea).';
let bandeja: BandejaGeneral;

const propietario = (): ClienteApi => bandeja.escenario.cuenta.propietario;
const sembrar = (cambios: CambiosDeLaFila = {}) => bandeja.sembrar(cambios);

/** Confirma las filas y devuelve el resultado de cada una por su id. */
async function confirmar(ids: string[], cuerpo: Record<string, unknown> = {}) {
  const respuesta = await propietario().post(`${RUTA_DTE}/confirmar`, { ids, ...cuerpo });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return new Map<string, any>(respuesta.cuerpo.resultados.map((r: any) => [r.id, r]));
}

const documentoGuardado = async (id: string) =>
  (
    await consultar<Record<string, any>>(
      `select tipo, tipo_dte, total, iva, exento, idp, otros_impuestos, motivo_sin_credito, motivo_fuera_del_libro,
              muestra_en_reportes_sat, to_char(periodo, 'YYYY-MM-DD') as periodo, observaciones, proveedor_id
       from libro_de_compras.documentos where id = $1`,
      [id],
    )
  )[0]!;

beforeAll(async () => {
  bandeja = await prepararBandejaGeneral(entorno, {
    usuario: 'bandejaconfirmar',
    nitDelProveedor: NIT_DEL_PROVEEDOR,
    encabezadosNoReconocidos: ['Columna rara'],
  });
});

afterAll(() => vi.restoreAllMocks());

describe('confirmar un lote fila por fila', () => {
  it('una fila mala no tumba a las demás: las buenas se registran y la mala queda pendiente con su error', async () => {
    const sinHistorial = await registrarProveedor(bandeja.escenario.cuenta, 'Sin historial', {
      nit: nitValido('4500002'),
    });
    const primera = await sembrar({ numero: '9101' });
    const mala = await sembrar({ numero: '9102', nitEmisor: nitValido('4500002'), conceptoId: undefined });
    const tercera = await sembrar({ numero: '9103' });

    const resultados = await confirmar([primera, mala, tercera]);

    expect(resultados.get(primera)).toMatchObject({ documentoId: expect.any(String) });
    expect(resultados.get(tercera)).toMatchObject({ documentoId: expect.any(String) });
    expect(resultados.get(mala)).toEqual({
      id: mala,
      error: expect.objectContaining({ codigo: 'dte_sin_concepto', detalles: { campo: 'conceptoId' } }),
    });
    for (const id of [primera, tercera]) {
      const fila = await filaGuardada(id);
      expect(fila).toMatchObject({ estado: 'registrado', documento_id: resultados.get(id).documentoId });
    }
    expect(await filaGuardada(mala)).toMatchObject({ estado: 'pendiente', documento_id: null });
    expect(sinHistorial.proveedorId).toBeTruthy();
  });

  it('el documento sale de los datos del DTE: proveedor, período, una línea con el concepto y la marca del resumen', async () => {
    const id = await sembrar();

    const resultado = (await confirmar([id])).get(id);

    const documento = await documentoGuardado(resultado.documentoId);
    expect(documento).toMatchObject({
      tipo: 'factura',
      tipo_dte: 'FACT',
      total: '1120.00',
      iva: '120.00',
      exento: '0.00',
      periodo: mesDe(0),
      observaciones: MARCA,
      proveedor_id: bandeja.proveedorId,
    });
    expect(resultado.avisos).toContain(MARCA);
    expect(resultado.avisos).toContain('La SAT no dice si es un bien o un servicio: se usó «bien», el de «Medicinas».');
    const lineas = await consultar(
      'select concepto_id, tipo from libro_de_compras.lineas_de_documento where documento_id = $1',
      [resultado.documentoId],
    );
    expect(lineas).toEqual([{ concepto_id: bandeja.escenario.conceptoId, tipo: 'bien' }]);
  });

  it('una fila que no existe, o repetida en la solicitud, se informa o se cuenta una sola vez', async () => {
    const id = await sembrar();
    const inexistente = crypto.randomUUID();

    const respuesta = await propietario().post(`${RUTA_DTE}/confirmar`, { ids: [id, id, inexistente] });

    expect(respuesta.cuerpo.resultados).toHaveLength(2);
    expect(respuesta.cuerpo.resultados.find((r: any) => r.id === inexistente).error.codigo).toBe('no_encontrado');
    expect(respuesta.cuerpo.resultados.find((r: any) => r.id === id).documentoId).toEqual(expect.any(String));
  });

  it('una fila ya registrada, descartada o anulada en la SAT no se confirma', async () => {
    const [registrada, descartada, anulada] = [
      await sembrar(),
      await sembrar(),
      await sembrar({ estadoSat: 'anulado', anuladoEnLaSatEl: mesDe(0) }),
    ];
    await confirmar([registrada]);
    await propietario().post(`${RUTA_DTE}/descartar`, { ids: [descartada], motivo: 'No es nuestra' });

    const resultados = await confirmar([registrada, descartada, anulada]);

    expect(resultados.get(registrada).error.codigo).toBe('dte_no_esta_pendiente');
    expect(resultados.get(descartada).error.codigo).toBe('dte_no_esta_pendiente');
    expect(resultados.get(anulada).error.codigo).toBe('dte_anulado_en_la_sat');
    expect((await filaGuardada(anulada)).estado).toBe('pendiente');
  });

  it('una fila con un monto en una columna desconocida no se confirma en lote; con cero, sí', async () => {
    const conMonto = await sembrar({ filaOriginal: { 'Columna rara': '25.00' } });
    const enCero = await sembrar({ filaOriginal: { 'Columna rara': '0.00' } });

    const resultados = await confirmar([conMonto, enCero]);

    expect(resultados.get(conMonto).error).toMatchObject({
      codigo: 'montos_en_columnas_desconocidas',
      detalles: { columnas: ['Columna rara'] },
    });
    expect(resultados.get(enCero).documentoId).toEqual(expect.any(String));
  });

  it('una nota necesita la factura que corrige; con ella se registra', async () => {
    const lineas = { total: '560.00', iva: '60.00', tipoDte: 'NCRE' } as const;
    const sinFactura = await sembrar({ ...lineas, serie: 'N' });
    const conFactura = await sembrar({ ...lineas, serie: 'N', documentoAfectadoId: bandeja.facturaId });

    const resultados = await confirmar([sinFactura, conFactura]);

    expect(resultados.get(sinFactura).error).toMatchObject({ codigo: 'dte_nota_sin_factura' });
    expect(resultados.get(conFactura).documentoId).toEqual(expect.any(String));
    expect((await documentoGuardado(resultados.get(conFactura).documentoId)).tipo).toBe('nota_de_credito');
  });
});

describe('exento deducido del resumen de la SAT', () => {
  let resultados: Map<string, any>;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    const casos: Record<string, CambiosDeLaFila> = {
      tolerancia: { iva: '120.04' },
      deducido: { iva: '108.00' },
      sinIva: { iva: '0.00' },
      negativo: { iva: '240.00' },
      conIdp: { total: '1370.00', iva: '120.00', idp: '150.00', otrosImpuestos: '100.00' },
    };
    for (const [nombre, cambios] of Object.entries(casos)) ids[nombre] = await sembrar(cambios);
    resultados = await confirmar(Object.values(ids));
  });

  it('un IVA que se aparta cuatro centavos cabe en la tolerancia: no hay exento y el IVA queda como el de la FEL', async () => {
    const documento = await documentoGuardado(resultados.get(ids.tolerancia!).documentoId);

    expect(documento).toMatchObject({ iva: '120.04', exento: '0.00', motivo_sin_credito: null });
  });

  it('un IVA menor que el del total deduce el exento y avisa que se revise', async () => {
    const resultado = resultados.get(ids.deducido!);

    expect(await documentoGuardado(resultado.documentoId)).toMatchObject({ iva: '108.00', exento: '112.00' });
    expect(resultado.avisos).toContain('Se dedujo un exento de Q112.00: revise la factura.');
  });

  it('una factura sin IVA es toda exenta y no da crédito', async () => {
    const documento = await documentoGuardado(resultados.get(ids.sinIva!).documentoId);

    expect(documento).toMatchObject({ iva: '0.00', exento: '1120.00', motivo_sin_credito: 'exento' });
  });

  it('un IVA mayor que el del total no se deduce: la fila queda pendiente y se abre en el formulario', async () => {
    expect(resultados.get(ids.negativo!).error.codigo).toBe('exento_negativo_del_dte');
    expect((await filaGuardada(ids.negativo!)).estado).toBe('pendiente');

    const solicitud = await propietario().get(`${RUTA_DTE}/${ids.negativo}/solicitud`);

    expect(solicitud.estado, JSON.stringify(solicitud.cuerpo)).toBe(200);
    expect(solicitud.cuerpo.solicitud).toMatchObject({
      tipoDte: 'FACT',
      proveedorId: bandeja.proveedorId,
      destino: 'cuentas-por-pagar',
      ivaDeLaFel: null,
      observaciones: MARCA,
      lineas: [{ conceptoId: bandeja.escenario.conceptoId, total: '1120.00', exento: '0.00' }],
    });
    expect(solicitud.cuerpo.avisos[0]).toContain('ábralo en el formulario');
  });

  it('el IDP y los otros impuestos del DTE van a la línea, con el IDP como el de la factura', async () => {
    const resultado = resultados.get(ids.conIdp!);

    expect(await documentoGuardado(resultado.documentoId)).toMatchObject({
      total: '1370.00',
      iva: '120.00',
      idp: '150.00',
      otros_impuestos: '100.00',
      exento: '0.00',
    });
    expect(resultado.avisos.join(' ')).not.toContain('bien o un servicio');
  });
});

describe('recibos FEL', () => {
  it('RECI y RDON entran fuera del libro con el motivo recibo_fel; el RDON avisa de la donación', async () => {
    const reci = await sembrar({ tipoDte: 'RECI', total: '500.00', iva: '0.00' });
    const rdon = await sembrar({ tipoDte: 'RDON', total: '300.00', iva: '0.00' });

    const resultados = await confirmar([reci, rdon]);

    for (const id of [reci, rdon]) {
      const documento = await documentoGuardado(resultados.get(id).documentoId);
      expect(documento).toMatchObject({
        tipo: 'recibo',
        motivo_fuera_del_libro: 'recibo_fel',
        muestra_en_reportes_sat: false,
        motivo_sin_credito: null,
      });
    }
    expect(resultados.get(rdon).avisos.join(' ')).toContain('Donación: deducible solo en el ISR sobre utilidades');
    expect(resultados.get(reci).avisos.join(' ')).not.toContain('Donación');
  });
});
