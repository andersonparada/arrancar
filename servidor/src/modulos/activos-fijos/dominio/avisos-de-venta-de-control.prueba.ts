import { describe, expect, it } from 'vitest';
import { avisosDeBaja, type DatosParaLosAvisos } from './avisos-de-baja.js';

const VENTA: DatosParaLosAvisos = {
  causa: 'venta',
  fecha: '2027-06-10',
  tieneActa: true,
  tipoDeActa: 'notarial',
  tieneDenuncia: true,
  esDeTerceros: false,
  esDeControl: true,
  regimenDeIva: 'general',
  regimenDeIsr: 'utilidades',
  origenDelCostoFiscal: 'en_libros',
  componentes: 0,
  incisoFiscal: 'herramientas',
  tipoDePersona: 'juridica',
  resultadoFiscalCentavos: 10000000,
};

const avisos = (cambios: Partial<DatosParaLosAvisos>) => avisosDeBaja({ ...VENTA, ...cambios });
const mensaje = (cambios: Partial<DatosParaLosAvisos>, codigo: string) =>
  avisos(cambios).find((aviso) => aviso.codigo === codigo)!.mensaje;

describe('avisos de vender un bien de control', () => {
  it('régimen general: débito de IVA del 12 % aunque el bien se haya llevado a gasto', () => {
    expect(mensaje({}, 'venta_con_iva')).toContain('débito de IVA del 12 %');
    expect(mensaje({}, 'venta_con_iva')).toContain('libro de ventas');
  });

  it('pequeño contribuyente: factura sin IVA desglosado, 5 % sobre el total y límite anual', () => {
    const texto = mensaje({ regimenDeIva: 'pequeno_contribuyente', regimenDeIsr: null }, 'venta_con_iva');

    expect(texto).toContain('no lleva IVA desglosado');
    expect(texto).toContain('5 %');
    expect(texto).toContain('límite anual');
  });

  it('sobre las utilidades: el resultado es el precio, ganancia de capital del 10 % y confirmar con el contador', () => {
    const texto = mensaje({}, 'isr_de_venta_de_control');

    expect(texto).toContain('el costo se dedujo como gasto');
    expect(texto).toContain('10 %');
    expect(texto).toContain('contador de la empresa');
  });

  it('opcional simplificado: avisa de la retención del comprador; pequeño contribuyente: del 10 % aparte', () => {
    const simplificado = mensaje({ regimenDeIsr: 'opcional_simplificado' }, 'isr_de_venta_de_control');
    const pequeno = mensaje({ regimenDeIva: 'pequeno_contribuyente', regimenDeIsr: null }, 'isr_de_venta_de_control');

    expect(simplificado).toContain('agente de retención');
    expect(pequeno).toContain('sustituye el ISR de la actividad');
    expect(pequeno).toContain('10 % aparte');
  });

  it('no repite el aviso de ganancia de capital de un activo con libros y avisa la pérdida', () => {
    const codigos = (cambios: Partial<DatosParaLosAvisos>) => avisos(cambios).map((aviso) => aviso.codigo);

    expect(codigos({})).toEqual(['venta_con_iva', 'isr_de_venta_de_control']);
    expect(codigos({ resultadoFiscalCentavos: -500 })).toContain('perdida_de_capital');
    expect(codigos({ esDeControl: false })).toContain('ganancia_de_capital');
  });

  it('avisa cuando el costo falta de documento o lo sostiene el contador', () => {
    const codigos = (origenDelCostoFiscal: DatosParaLosAvisos['origenDelCostoFiscal']) =>
      avisos({ origenDelCostoFiscal }).map((aviso) => aviso.codigo);

    expect(codigos('sin_documento')).toContain('costo_fiscal_sin_documento');
    expect(codigos('criterio_del_contador')).toContain('costo_sostenido_por_el_contador');
    expect(codigos('documentado')).toEqual(['venta_con_iva', 'isr_de_venta_de_control']);
  });
});
