import { describe, expect, it } from 'vitest';
import { configuracionDelLibroDeCompras } from '../configuracion.js';
import { CalendarioDeLunesAViernes, type CalendarioLaboral } from './calendario-laboral.js';
import { calcularDocumento } from './calculo-de-documento.js';
import { calcularRetenciones } from './calculador-de-retenciones.js';
import { configuracionDeRetenciones } from './configuracion-de-retenciones.js';
import { DatosFiscalesDeEmpresa, type PropiedadesFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import { DatosFiscalesDeProveedor } from './datos-fiscales-de-proveedor.js';
import { avisosDeRetenciones } from './avisos-de-retenciones.js';
import type { RetencionDeDocumento } from './documento-de-compra.js';
import { fechaLimiteDeEntero, ULTIMO_DIA_HABIL, type PlazoDeEntero } from './plazo-de-entero.js';
import type { EntradaDeRetenciones, RetencionPropuesta } from './retencion-propuesta.js';
import type { TipoDeDocumento } from './tipos-de-documento.js';

const predeterminados = new Map(
  configuracionDelLibroDeCompras.map((c) => [c.clave, c.predeterminado as number | boolean]),
);
const configuracion = configuracionDeRetenciones((clave) => predeterminados.get(clave) as number | boolean);

interface Caso {
  total: number;
  tipo?: TipoDeDocumento;
  empresa?: Partial<PropiedadesFiscalesDeEmpresa>;
  conCredito?: boolean;
}

function entrada({ total, tipo = 'factura_especial', empresa, conCredito = true }: Caso): EntradaDeRetenciones {
  const documento = calcularDocumento({
    tipo,
    muestraEnReportesSat: true,
    noVinculado: false,
    empresaConCreditoFiscal: conCredito,
    empresaConIsrSobreUtilidades: true,
    fechaDeEmision: '2026-01-15',
    fechaDeRecepcion: '2026-01-20',
    periodo: '2026-01-01',
    lineas: [{ total, exento: 0 }],
    tasaDeIva: 1200,
    mesActual: '2026-01-01',
  });
  const propiedades = { ...DatosFiscalesDeEmpresa.porOmision().instantanea(), ...empresa };
  return {
    tipo,
    muestraEnReportesSat: true,
    documento,
    datosDeLineas: [{ esProductoAgropecuario: false, tipo: 'bien' }],
    empresa: DatosFiscalesDeEmpresa.crear(propiedades),
    proveedor: DatosFiscalesDeProveedor.porOmision({ regimenIva: 'sin_inscripcion' }),
    configuracion,
  };
}

const resumen = (propuestas: RetencionPropuesta[]) =>
  propuestas.map((r) => [r.regla, r.base, r.porcentaje, r.montoPropuesto, r.origenDeLaFecha]);

describe('retenciones de la factura especial', () => {
  it('retiene el 100 % del IVA y el 5 % del valor sin IVA, con la fecha de emisión', () => {
    // Q112.00 = Q100.00 + Q12.00 de IVA.
    expect(resumen(calcularRetenciones(entrada({ total: 11200 })))).toEqual([
      ['iva_factura_especial', 1200, 10000, 1200, 'emision'],
      ['isr_factura_especial', 10000, 500, 500, 'emision'],
    ]);
  });

  it('no tiene mínimo: retiene aunque el total sea de pocos quetzales', () => {
    expect(calcularRetenciones(entrada({ total: 112 }))).toHaveLength(2);
  });

  it('retiene aunque la empresa no sea agente de nada ni tenga ISR sobre utilidades', () => {
    const sinNada = { agenteDeRetencionIva: 'ninguno', esAgenteDeRetencionIsr: false } as const;

    expect(calcularRetenciones(entrada({ total: 11200, empresa: sinNada })).map((r) => r.regla)).toEqual([
      'iva_factura_especial',
      'isr_factura_especial',
    ]);
  });

  it('con la empresa sin crédito el IVA va al costo y se retiene igual', () => {
    const sinCredito = entrada({ total: 11200, conCredito: false });

    expect(sinCredito.documento.motivoSinCredito).toBe('empresa_sin_credito');
    expect(sinCredito.documento.totales.ivaNoAcreditable).toBe(1200);
    expect(resumen(calcularRetenciones(sinCredito))[0]).toEqual(['iva_factura_especial', 1200, 10000, 1200, 'emision']);
  });

  it('con el crédito de una factura: sin motivo sin crédito', () => {
    expect(entrada({ total: 11200 }).documento.motivoSinCredito).toBeNull();
  });

  it('una factura normal no recibe estas reglas', () => {
    const reglas = calcularRetenciones(entrada({ total: 11200, tipo: 'factura' })).map((r) => r.regla);

    expect(reglas).not.toContain('iva_factura_especial');
    expect(reglas).not.toContain('isr_factura_especial');
  });

  it('el porcentaje del ISR sale de la configuración', () => {
    const otra = {
      ...entrada({ total: 11200 }),
      configuracion: { ...configuracion, porcentajeIsrFacturaEspecial: 700 },
    };

    expect(resumen(calcularRetenciones(otra))[1]).toEqual(['isr_factura_especial', 10000, 700, 700, 'emision']);
  });
});

describe('plazo de entero de la factura especial', () => {
  const lunesAViernes = new CalendarioDeLunesAViernes();
  const retencion = (regla: RetencionDeDocumento['regla'], impuesto: 'iva' | 'isr'): RetencionDeDocumento => ({
    impuesto,
    regla,
    base: 10000,
    porcentaje: 500,
    montoPropuesto: 500,
    monto: 500,
    motivoDelAjuste: null,
    fecha: '2026-09-15',
  });
  const entero = (hoy: string, calendario: CalendarioLaboral = lunesAViernes) => ({
    hoy,
    diasHabilesIva: 15,
    diasHabilesIsr: 10,
    calendario,
    empresaConIsrSobreUtilidades: true,
  });

  it('el IVA vence el último día hábil del mes siguiente', () => {
    // Octubre de 2026 termina en sábado 31: el último día hábil es el viernes 30.
    const plazo = {
      fechaDeLaRetencion: '2026-09-15',
      diasHabiles: ULTIMO_DIA_HABIL,
      calendario: lunesAViernes,
    } satisfies PlazoDeEntero;

    expect(fechaLimiteDeEntero(plazo)).toBe('2026-10-30');
  });

  it('un feriado al final del mes corre el límite hacia atrás', () => {
    const feriado: CalendarioLaboral = { esHabil: (fecha) => fecha !== '2026-10-30' && lunesAViernes.esHabil(fecha) };
    const plazo = {
      fechaDeLaRetencion: '2026-09-15',
      diasHabiles: ULTIMO_DIA_HABIL,
      calendario: feriado,
    } satisfies PlazoDeEntero;

    expect(fechaLimiteDeEntero(plazo)).toBe('2026-10-29');
  });

  it('cruza el fin de año', () => {
    // Enero de 2027 termina en domingo 31: el último día hábil es el viernes 29.
    const plazo = {
      fechaDeLaRetencion: '2026-12-10',
      diasHabiles: ULTIMO_DIA_HABIL,
      calendario: lunesAViernes,
    } satisfies PlazoDeEntero;

    expect(fechaLimiteDeEntero(plazo)).toBe('2027-01-29');
  });

  it('el aviso del IVA de la factura especial usa el último día hábil, no los días del IVA general', () => {
    const iva = retencion('iva_factura_especial', 'iva');

    expect(avisosDeRetenciones([iva], entero('2026-10-30'))).toEqual([]);
    expect(avisosDeRetenciones([iva], entero('2026-10-31'))[0]).toContain('venció el 30/10/2026');
  });

  it('el ISR de la factura especial vence a los 10 días hábiles del mes siguiente', () => {
    const isr = retencion('isr_factura_especial', 'isr');

    // Octubre de 2026 empieza en jueves: el 10.º día hábil es el miércoles 14.
    expect(avisosDeRetenciones([isr], entero('2026-10-14'))).toEqual([]);
    expect(avisosDeRetenciones([isr], entero('2026-10-15'))[0]).toContain('venció el 14/10/2026');
  });
});
