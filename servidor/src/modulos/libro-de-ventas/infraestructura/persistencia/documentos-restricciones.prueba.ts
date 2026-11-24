/**
 * Prueba de integración contra PostgreSQL (base de pruebas): los `check` y los únicos de los documentos de venta y
 * de sus líneas (migración 0002).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cerrarBase,
  cuentaA,
  documento,
  empresaA2,
  en,
  insertar,
  prepararBase,
  restriccionQueViola,
  usuarioId,
} from './documentos.soporte.js';

beforeAll(prepararBase);
afterAll(cerrarBase);

describe('documentos: restricciones de forma', () => {
  it.each([
    ['tipo desconocido', { tipo: 'cheque' as never }, 'documentos_tipo_valido'],
    [
      'código de otra familia',
      { tipoDte: 'NCRE' as const, autorizacionFel: crypto.randomUUID() },
      'documentos_tipo_dte_de_la_familia',
    ],
    ['FEL sin código de la SAT', { autorizacionFel: crypto.randomUUID() }, 'documentos_fel_con_tipo_dte'],
    ['código sin FEL', { tipoDte: 'FACT' as const }, 'documentos_fel_con_tipo_dte'],
    ['régimen desconocido', { regimenIvaDeLaEmpresa: 'otro' as never }, 'documentos_regimen_iva_valido'],
    ['consumidor final con otro NIT', { tipoDeIdentificacion: 'cf' as const }, 'documentos_cf_con_nit_cf'],
    ['sin cliente y con NIT', { clienteId: null }, 'documentos_sin_cliente_es_cf'],
    ['recibo en los reportes de la SAT', { tipo: 'recibo' as const }, 'documentos_recibo_fuera_de_los_reportes'],
    ['serie con espacios', { serie: 'A B' }, 'documentos_serie_valida'],
    ['número en minúsculas', { numero: 'abc' }, 'documentos_numero_valido'],
    [
      'destino sin cliente',
      {
        destino: 'cuentas-por-cobrar' as const,
        clienteId: null,
        nitReceptor: 'CF',
        tipoDeIdentificacion: 'cf' as const,
      },
      'documentos_destino_con_cliente',
    ],
    ['procesado sin destino', { procesadoEnDestinoEn: new Date() }, 'documentos_procesado_con_destino'],
  ] as const)('rechaza %s', async (_caso, cambios, restriccion) => {
    expect(await restriccionQueViola(insertar(documento(cambios as never)))).toBe(restriccion);
  });

  it.each([
    ['totales que no cuadran', { total: '113.00', totalEnMoneda: '113.00' }, 'documentos_totales_cuadran'],
    ['columna negativa', { exento: '-1.00', gravadoBienes: '101.00' }, 'documentos_columnas_no_negativas'],
    ['período que no es el mes de emisión', { periodo: '2026-04-01' }, 'documentos_periodo_es_el_mes_de_emision'],
    ['quetzales con otro total en moneda', { totalEnMoneda: '10.00' }, 'documentos_quetzales_sin_cambio'],
  ] as const)('rechaza %s', async (_caso, cambios, restriccion) => {
    expect(await restriccionQueViola(insertar(documento(cambios as never)))).toBe(restriccion);
  });

  it.each([
    ['nota sin factura', { tipo: 'nota_de_credito' as const }, 'documentos_nota_con_factura'],
    [
      'factura que cita otra factura',
      { facturaAnteriorNumero: '9', facturaAnteriorFecha: '2025-12-01' },
      'documentos_nota_con_factura',
    ],
    [
      'número anterior sin fecha',
      { tipo: 'nota_de_credito' as const, facturaAnteriorNumero: '9' },
      'documentos_factura_anterior_completa',
    ],
    ['serie anterior sin número', { facturaAnteriorSerie: 'A' }, 'documentos_factura_anterior_completa'],
    ['anulado sin los datos de la anulación', { estado: 'anulado' as const }, 'documentos_anulacion_completa'],
    ['vigente con datos de anulación', { motivoDeAnulacion: 'x' }, 'documentos_anulacion_completa'],
  ] as const)('rechaza %s', async (_caso, cambios, restriccion) => {
    expect(await restriccionQueViola(insertar(documento(cambios as never)))).toBe(restriccion);
  });
});

describe('documentos: números únicos', () => {
  it('el número no se repite mientras el documento esté vigente, pero otra familia o empresa puede usarlo', async () => {
    const base = documento({ serie: 'U', numero: '100' });
    await insertar(base);

    const repetido = insertar(documento({ serie: 'U', numero: '100' }));
    const otraFamilia = insertar(documento({ serie: 'U', numero: '100', tipo: 'factura_cambiaria' }));
    const otraEmpresa = insertar(
      documento({ serie: 'U', numero: '100', empresaId: empresaA2 }),
      en(empresaA2, cuentaA),
    );

    expect(await restriccionQueViola(repetido)).toBe('documentos_serie_y_numero_unicos');
    await expect(otraFamilia).resolves.toBeTruthy();
    await expect(otraEmpresa).resolves.toBeTruthy();
  });

  const anulado = (causa: 'fel_anulada_en_la_sat' | 'error_de_captura' | 'no_corresponde_a_la_empresa') =>
    ({
      estado: 'anulado',
      anuladoEn: new Date(),
      anuladoPor: usuarioId,
      motivoDeAnulacion: 'Prueba',
      causaDeAnulacion: causa,
      fechaDeAnulacion: '2026-03-20',
    }) as const;

  it('el número anulado en la SAT no se reutiliza, pero el anulado por error de captura sí', async () => {
    await insertar(documento({ serie: 'V', numero: '1', ...anulado('fel_anulada_en_la_sat') }));
    await insertar(documento({ serie: 'V', numero: '2', ...anulado('error_de_captura') }));
    await insertar(documento({ serie: 'V', numero: '3', ...anulado('no_corresponde_a_la_empresa') }));

    const enLaSat = insertar(documento({ serie: 'V', numero: '1' }));
    const correcto = insertar(documento({ serie: 'V', numero: '2' }));
    const ajeno = insertar(documento({ serie: 'V', numero: '3' }));

    expect(await restriccionQueViola(enLaSat)).toBe('documentos_serie_y_numero_unicos');
    await expect(correcto).resolves.toBeTruthy();
    await expect(ajeno).resolves.toBeTruthy();
  });

  it('la autorización FEL de un registro anulado por error de captura se puede volver a registrar', async () => {
    const libre = crypto.randomUUID();
    const ocupada = crypto.randomUUID();
    await insertar(documento({ tipoDte: 'FACT', autorizacionFel: libre, ...anulado('error_de_captura') }));
    await insertar(documento({ tipoDte: 'FACT', autorizacionFel: ocupada, ...anulado('fel_anulada_en_la_sat') }));

    const otraVez = insertar(documento({ tipoDte: 'FACT', autorizacionFel: libre }));
    const repetida = insertar(documento({ tipoDte: 'FACT', autorizacionFel: ocupada }));

    await expect(otraVez).resolves.toBeTruthy();
    expect(await restriccionQueViola(repetida)).toBe('documentos_autorizacion_fel_unica');
  });

  it('la autorización FEL no se repite en la empresa', async () => {
    const autorizacionFel = crypto.randomUUID();
    await insertar(documento({ tipoDte: 'FACT', autorizacionFel }));

    const repetido = insertar(documento({ tipoDte: 'FCAM', tipo: 'factura_cambiaria', autorizacionFel }));

    expect(await restriccionQueViola(repetido)).toBe('documentos_autorizacion_fel_unica');
  });
});
