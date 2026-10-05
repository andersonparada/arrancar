import { describe, expect, it } from 'vitest';
import { AVISO_DE_RETENCION_QUITADA, avisosDeRetenciones } from './avisos-de-retenciones.js';
import { AVISO_DE_PROVEEDOR_NO_DOMICILIADO, avisosDelProveedor } from './avisos-del-proveedor.js';
import { CalendarioDeLunesAViernes, type CalendarioLaboral } from './calendario-laboral.js';
import { DatosFiscalesDeProveedor } from './datos-fiscales-de-proveedor.js';
import type { RetencionDeDocumento } from './documento-de-compra.js';
import { AVISO_DE_CONSUMIDOR_FINAL_GRANDE, avisosDeConsumidorFinal } from './fuera-del-libro.js';
import { sumarMesesALaFecha } from './periodo-del-libro.js';
import { AVISO_DE_NOTA_TARDIA, avisosDeNotaTardia } from './reglas-de-notas-de-credito.js';

const retencion = (cambios: Partial<RetencionDeDocumento> = {}): RetencionDeDocumento => ({
  impuesto: 'iva',
  regla: 'iva_contribuyente_especial',
  base: 60000,
  porcentaje: 1500,
  montoPropuesto: 9000,
  monto: 9000,
  motivoDelAjuste: null,
  fecha: '2026-06-10',
  ...cambios,
});
const isr = (cambios: Partial<RetencionDeDocumento> = {}) =>
  retencion({ impuesto: 'isr', regla: 'isr_opcional_simplificado', ...cambios });
const entero = {
  hoy: '2026-10-04',
  diasHabilesIva: 15,
  diasHabilesIsr: 10,
  calendario: new CalendarioDeLunesAViernes(),
};

describe('avisos del entero de las retenciones', () => {
  it('avisa el entero vencido de cada impuesto una sola vez, y nada si el plazo no pasó', () => {
    const avisos = avisosDeRetenciones([retencion(), retencion({ regla: 'iva_exportador' })], entero);

    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('retención de IVA venció el 21/07/2026, o vence en los próximos días si hubo feriados');
    expect(avisos[0]).toContain('confírmelo');
    expect(avisosDeRetenciones([retencion()], { ...entero, hoy: '2026-07-21' })).toEqual([]);
  });

  it('el entero del ISR se cuenta desde la fecha de la factura (la fecha de la retención) y lo dice', () => {
    // Factura de junio: 10.º día hábil de julio = 14/07/2026.
    const avisos = avisosDeRetenciones([isr()], { ...entero, hoy: '2026-07-15' });

    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('se cuenta desde la fecha de la factura, Decreto 10-2012 art. 48');
    expect(avisos[0]).toContain('venció el 14/07/2026');
    expect(avisosDeRetenciones([isr()], { ...entero, hoy: '2026-07-14' })).toEqual([]);
  });

  it('el IVA y el ISR se cuentan igual desde `retencion.fecha`, sin caso especial', () => {
    const avisos = avisosDeRetenciones([isr({ fecha: '2026-01-05' })], { ...entero, hoy: '2026-02-20' });

    expect(avisos[0]).toContain('venció el 13/02/2026');
  });

  it('usa el calendario laboral: un feriado alarga el plazo', () => {
    const feriado: CalendarioLaboral = {
      esHabil: (fecha) => fecha !== '2026-07-14' && entero.calendario.esHabil(fecha),
    };

    expect(avisosDeRetenciones([isr()], { ...entero, hoy: '2026-07-15', calendario: feriado })).toEqual([]);
  });
});

describe('avisos de una retención quitada o rebajada', () => {
  it('una retención quitada avisa la responsabilidad solidaria y no cuenta para el entero', () => {
    const quitada = retencion({ monto: 0, motivoDelAjuste: 'Exento' });

    expect(avisosDeRetenciones([quitada], entero)).toEqual([AVISO_DE_RETENCION_QUITADA]);
  });

  it('una retención rebajada (monto menor que el propuesto) también avisa', () => {
    const rebajada = retencion({ monto: 4500, motivoDelAjuste: 'Mitad' });

    const avisos = avisosDeRetenciones([rebajada], { ...entero, hoy: '2026-06-11' });

    expect(avisos).toEqual([AVISO_DE_RETENCION_QUITADA]);
    expect(AVISO_DE_RETENCION_QUITADA).toContain('Código Tributario art. 29');
    expect(AVISO_DE_RETENCION_QUITADA).toContain('Decreto 10-2012 art. 22');
  });

  it('una retención subida o sin tocar no avisa', () => {
    const subida = retencion({ monto: 10000, motivoDelAjuste: 'Más' });

    expect(avisosDeRetenciones([subida, retencion()], { ...entero, hoy: '2026-06-11' })).toEqual([]);
  });
});

describe('otros avisos del documento', () => {
  it('la nota tardía se mide de fecha a fecha (emisión de la factura más dos meses)', () => {
    expect(avisosDeNotaTardia('2027-01-05', '2026-10-01')).toEqual([AVISO_DE_NOTA_TARDIA]);
    expect(avisosDeNotaTardia('2026-12-01', '2026-10-31')).toEqual([]);
    expect(avisosDeNotaTardia('2026-12-31', '2026-10-31')).toEqual([]);
    expect(avisosDeNotaTardia('2027-01-01', '2026-10-31')).toEqual([AVISO_DE_NOTA_TARDIA]);
    expect(AVISO_DE_NOTA_TARDIA).toContain('Aun así, rebájela en el período en que la recibe');
  });

  it('sumar meses a una fecha respeta el último día del mes', () => {
    expect(sumarMesesALaFecha('2026-12-31', 2)).toBe('2027-02-28');
    expect(sumarMesesALaFecha('2026-10-15', 2)).toBe('2026-12-15');
  });

  it('avisa un proveedor no domiciliado con el texto del ISR de no residentes', () => {
    const extranjero = DatosFiscalesDeProveedor.porOmision({ regimenIsr: 'no_domiciliado' });

    expect(avisosDelProveedor(extranjero)).toEqual([AVISO_DE_PROVEEDOR_NO_DOMICILIADO]);
    expect(AVISO_DE_PROVEEDOR_NO_DOMICILIADO).toContain(
      'ISR de no residentes (Decreto 10-2012, rentas de no residentes)',
    );
    expect(avisosDelProveedor(DatosFiscalesDeProveedor.porOmision())).toEqual([]);
  });

  it('una FEL a consumidor final de Q2,500.00 o más avisa; con menos, o con otro motivo, no', () => {
    expect(avisosDeConsumidorFinal('fel_a_consumidor_final', 250000)).toEqual([AVISO_DE_CONSUMIDOR_FINAL_GRANDE]);
    expect(avisosDeConsumidorFinal('fel_a_consumidor_final', 249999)).toEqual([]);
    expect(avisosDeConsumidorFinal('fel_a_otro_nit', 900000)).toEqual([]);
    expect(avisosDeConsumidorFinal(null, 900000)).toEqual([]);
  });
});
