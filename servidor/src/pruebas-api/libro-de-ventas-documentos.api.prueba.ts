/**
 * Documentos de venta (LV-2): registrar, anular y eliminar por la API; auditoría, aislamiento entre cuentas y los datos
 * que quedan guardados.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar } from './soporte/escenario-de-documentos.js';
import {
  documentoDeVentaDePrueba,
  prepararEscenarioDeVentas,
  RUTA_DOCUMENTOS_DE_VENTA as RUTA,
  type EscenarioDeVentas,
} from './soporte/escenario-de-ventas.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeVentas;
let ajeno: EscenarioDeVentas;

const propietario = () => escenario.cuenta.propietario;
const registrar = async (cambios: Record<string, unknown> = {}) => {
  const respuesta = await propietario().post(RUTA, documentoDeVentaDePrueba(escenario, cambios));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento as { id: string };
};
const auditoriaDe = (accion: string) =>
  consultar<{ registro_id: string; motivo: string | null; anterior: { numero: string } }>(
    "select registro_id, motivo, anterior from core.auditoria where recurso = 'libro-de-ventas.documentos' and accion = $1 and cuenta_id = $2",
    [accion, escenario.cuenta.cuentaId],
  );

beforeAll(async () => {
  escenario = await prepararEscenarioDeVentas(entorno, 'ventasdocumentos');
  ajeno = await prepararEscenarioDeVentas(entorno, 'ventasdocumentosajeno');
});

afterAll(() => vi.restoreAllMocks());

describe('registrar una factura', () => {
  it('responde 201 con la ficha, los totales por columna y el régimen del mes, y lo guarda en quetzales', async () => {
    const respuesta = await propietario().post(RUTA, documentoDeVentaDePrueba(escenario));

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.avisos).toEqual([]);
    expect(respuesta.cuerpo.documento).toMatchObject({
      tipo: 'factura',
      estado: 'vigente',
      regimenIvaDeLaEmpresa: 'general',
      clienteId: escenario.clienteId,
      tipoDeIdentificacion: 'nit',
      nitReceptor: '576937K',
      nombreReceptor: 'Distribuidora Quiroa',
      destino: null,
      moneda: 'GTQ',
      totales: { total: '1120.00', gravadoBienes: '1000.00', gravadoServicios: '0.00', iva: '120.00' },
      puedeAnular: true,
      puedeEliminar: true,
    });
    expect(respuesta.cuerpo.documento.lineas).toEqual([
      expect.objectContaining({ orden: 1, claseFiscal: 'gravada', tipo: 'bien', base: '1000.00', iva: '120.00' }),
    ]);
    const [fila] = await consultar<{ total: string; moneda: string; empresa_id: string }>(
      'select total, moneda, empresa_id from libro_de_ventas.documentos where id = $1',
      [respuesta.cuerpo.documento.id],
    );
    expect(fila).toEqual({ total: '1120.00', moneda: 'GTQ', empresa_id: escenario.cuenta.empresaId });
  });

  it('un servicio gravado y una línea exenta caen en su columna del libro', async () => {
    const respuesta = await propietario().post(
      RUTA,
      documentoDeVentaDePrueba(escenario, {
        lineas: [
          { conceptoDeIngresoId: escenario.servicioId, total: '560.00' },
          { conceptoDeIngresoId: escenario.conceptoId, total: '100.00', claseFiscal: 'exenta' },
          { conceptoDeIngresoId: escenario.conceptoId, total: '300.00', claseFiscal: 'exportacion' },
        ],
      }),
    );

    expect(respuesta.cuerpo.documento.totales).toEqual({
      total: '960.00',
      gravadoBienes: '0.00',
      gravadoServicios: '500.00',
      exento: '100.00',
      exportacion: '300.00',
      iva: '60.00',
      otrosImpuestos: '0.00',
    });
  });

  it('sin cliente es consumidor final', async () => {
    const respuesta = await propietario().post(RUTA, documentoDeVentaDePrueba(escenario, { clienteId: null }));

    expect(respuesta.cuerpo.documento).toMatchObject({
      clienteId: null,
      tipoDeIdentificacion: 'cf',
      nitReceptor: 'CF',
    });
  });

  it('con FEL pide el código de la SAT y su familia lo deduce; el mismo número o la misma FEL se rechazan', async () => {
    const autorizacionFel = crypto.randomUUID();
    const sinCodigo = await propietario().post(RUTA, documentoDeVentaDePrueba(escenario, { autorizacionFel }));
    const registrada = await propietario().post(
      RUTA,
      documentoDeVentaDePrueba(escenario, {
        autorizacionFel,
        tipoDte: 'FCAM',
        tipo: undefined,
        serie: 'FEL',
        numero: '77',
      }),
    );
    const mismoNumero = await propietario().post(
      RUTA,
      documentoDeVentaDePrueba(escenario, {
        tipo: undefined,
        tipoDte: 'FCAM',
        autorizacionFel: crypto.randomUUID(),
        serie: 'fel',
        numero: '77',
      }),
    );
    const mismaFel = await propietario().post(
      RUTA,
      documentoDeVentaDePrueba(escenario, {
        autorizacionFel,
        tipoDte: 'FCAM',
        tipo: undefined,
        serie: 'OTRA',
        numero: '1',
      }),
    );

    expect(sinCodigo.cuerpo.error.codigo).toBe('tipo_dte_obligatorio');
    expect(registrada.cuerpo.documento).toMatchObject({ tipo: 'factura_cambiaria', tipoDte: 'FCAM', serie: 'FEL' });
    expect(mismoNumero.estado).toBe(409);
    expect(mismoNumero.cuerpo.error).toMatchObject({
      codigo: 'documento_repetido',
      detalles: { documentoId: registrada.cuerpo.documento.id },
    });
    expect(mismaFel.cuerpo.error.codigo).toBe('documento_repetido');
  });

  it('rechaza lo mal formado y lo que las reglas no admiten', async () => {
    const sinLineas = await propietario().post(RUTA, documentoDeVentaDePrueba(escenario, { lineas: [] }));
    const montoMalo = await propietario().post(
      RUTA,
      documentoDeVentaDePrueba(escenario, { lineas: [{ conceptoDeIngresoId: escenario.conceptoId, total: '1.234' }] }),
    );
    const conceptoAjeno = await propietario().post(
      RUTA,
      documentoDeVentaDePrueba(escenario, { lineas: [{ conceptoDeIngresoId: ajeno.conceptoId, total: '10.00' }] }),
    );
    const clienteAjeno = await propietario().post(
      RUTA,
      documentoDeVentaDePrueba(escenario, { clienteId: ajeno.clienteId }),
    );
    const ivaDesviado = await propietario().post(RUTA, documentoDeVentaDePrueba(escenario, { ivaDelDte: '130.00' }));

    expect(sinLineas.estado).toBe(400);
    expect(montoMalo.estado).toBe(400);
    expect(conceptoAjeno.estado).toBe(404);
    expect(clienteAjeno.estado).toBe(404);
    expect(ivaDesviado.cuerpo.error.codigo).toBe('correccion_de_iva_excedida');
  });
});

describe('anular', () => {
  it('deja el rastro en la auditoría con el motivo y cómo estaba, y el número no se reutiliza', async () => {
    const original = await registrar({ serie: 'ANU', numero: '1' });

    const respuesta = await propietario().post(`${RUTA}/${original.id}/anular`, {
      causa: 'no_corresponde_a_la_empresa',
      motivo: 'No es de esta empresa',
    });

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.documento).toMatchObject({
      estado: 'anulado',
      anulacion: { causa: 'no_corresponde_a_la_empresa', motivo: 'No es de esta empresa' },
    });
    const [auditado] = (await auditoriaDe('anular')).filter((fila) => fila.registro_id === original.id);
    expect(auditado).toMatchObject({
      motivo: 'no_corresponde_a_la_empresa: No es de esta empresa',
      anterior: { numero: '1' },
    });
    const repetido = await propietario().post(RUTA, documentoDeVentaDePrueba(escenario, { serie: 'ANU', numero: '1' }));
    expect(repetido.cuerpo.error.codigo).toBe('documento_repetido');
    expect(
      (await propietario().post(`${RUTA}/${original.id}/anular`, { causa: 'error_de_captura', motivo: 'x' })).cuerpo
        .error.codigo,
    ).toBe('documento_ya_anulado');
  });

  it('pide causa y motivo', async () => {
    const original = await registrar();

    const sinMotivo = await propietario().post(`${RUTA}/${original.id}/anular`, {
      causa: 'error_de_captura',
      motivo: ' ',
    });
    const causaRara = await propietario().post(`${RUTA}/${original.id}/anular`, { causa: 'porque sí', motivo: 'x' });
    const largo = await propietario().post(`${RUTA}/${original.id}/anular`, {
      causa: 'error_de_captura',
      motivo: 'x'.repeat(301),
    });

    expect([sinMotivo.estado, causaRara.estado, largo.estado]).toEqual([400, 400, 400]);
    expect(largo.cuerpo.error.codigo).toBe('motivo_de_anulacion_invalido');
  });
});

describe('eliminar', () => {
  it('borra el documento y sus líneas y deja el rastro en la auditoría', async () => {
    const original = await registrar({ serie: 'ELI', numero: '1' });

    const respuesta = await propietario().delete(`${RUTA}/${original.id}`);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toEqual({ avisos: [] });
    expect((await propietario().get(`${RUTA}/${original.id}`)).estado).toBe(404);
    const lineas = await consultar('select 1 from libro_de_ventas.lineas_de_documento where documento_id = $1', [
      original.id,
    ]);
    expect(lineas).toEqual([]);
    const [auditado] = (await auditoriaDe('eliminar')).filter((fila) => fila.registro_id === original.id);
    expect(auditado).toMatchObject({ anterior: { numero: '1' } });
  });

  it('un documento anulado o con notas no se elimina', async () => {
    const anulado = await registrar();
    await propietario().post(`${RUTA}/${anulado.id}/anular`, { causa: 'error_de_captura', motivo: 'x' });
    const conNota = await registrar();
    await registrar({ tipo: 'nota_de_credito', documentoAfectadoId: conNota.id });

    expect((await propietario().delete(`${RUTA}/${anulado.id}`)).cuerpo.error.codigo).toBe('documento_ya_anulado');
    expect((await propietario().delete(`${RUTA}/${conNota.id}`)).cuerpo.error.codigo).toBe('documento_con_notas');
  });
});
