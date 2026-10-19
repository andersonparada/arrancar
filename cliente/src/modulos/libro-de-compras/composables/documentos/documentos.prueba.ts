import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { FichaDeDocumento, LineaDeDocumento, RetencionDeDocumento } from '../../servicios/documentos.api';
import { MOTIVOS_FUERA_DEL_LIBRO, MOTIVOS_SIN_CREDITO } from '../../textos-de-documentos';
import { cifrasDeLinea, nombreDeLinea, sumarMontos, tituloDeDocumento, totalRetenido } from './detalles-de-documento';
import { cifrasDeRetencion, estadoDeRetencion, nombreDeRetencion } from './detalles-de-retencion';
import {
  datosDeAnulacion,
  edicionDeAnulacionVacia,
  erroresDeAnulacion,
  explicacionesDeAcciones,
  mensajeDeEliminacion,
  opcionesDeCausa,
  resumenDeAnulacion,
} from './reglas-de-baja-de-documento';

// Los textos dan formato con `formatearFecha` y `formatearMonto`, que leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const retencion = (cambios: Partial<RetencionDeDocumento> = {}): RetencionDeDocumento => ({
  impuesto: 'iva',
  regla: 'iva_contribuyente_especial',
  base: '1000.00',
  porcentaje: '15.00',
  montoPropuesto: '150.00',
  monto: '150.00',
  motivoDelAjuste: null,
  fecha: '2026-10-05',
  ...cambios,
});

const linea = (cambios: Partial<LineaDeDocumento> = {}): LineaDeDocumento => ({
  numero: 1,
  conceptoId: 'c-1',
  descripcion: null,
  tipo: 'bien',
  esActivoFijo: false,
  combustible: null,
  total: '112.00',
  exento: '0.00',
  idp: '0.00',
  base: '100.00',
  iva: '12.00',
  ivaNoAcreditable: '0.00',
  costo: '100.00',
  ...cambios,
});

const ficha = (cambios: Partial<FichaDeDocumento> = {}): FichaDeDocumento =>
  ({
    id: 'd-1',
    tipo: 'factura',
    nombreEmisor: 'Ferretería La Unión',
    serie: 'A',
    numero: '123',
    totales: { total: '1250.50' },
    retenciones: [],
    notas: [],
    estado: 'vigente',
    procesadoEnDestinoEn: null,
    puedeAnular: true,
    puedeEliminar: true,
    ...cambios,
  }) as FichaDeDocumento;

describe('textos de los motivos', () => {
  it('cada motivo sin crédito tiene su texto', () => {
    expect(MOTIVOS_SIN_CREDITO.empresa_sin_credito).toContain('Por el régimen de IVA de la empresa');
    expect(Object.keys(MOTIVOS_SIN_CREDITO).sort()).toEqual([
      'contribuyente_agropecuario',
      'empresa_sin_credito',
      'exento',
      'fuera_de_plazo',
      'no_vinculado',
      'pequeno_contribuyente',
      'primario_pecuario',
    ]);
  });

  it('cada motivo de fuera del libro tiene su texto', () => {
    expect(Object.keys(MOTIVOS_FUERA_DEL_LIBRO).sort()).toEqual([
      'fel_a_consumidor_final',
      'fel_a_otro_nit',
      'sin_fel',
    ]);
  });
});

describe('detalles del documento', () => {
  it('el título lleva el tipo y la serie con el número', () => {
    expect(tituloDeDocumento({ tipo: 'factura', serie: 'A', numero: '123' })).toBe('Factura A-123');
    expect(tituloDeDocumento({ tipo: 'nota_de_credito', serie: null, numero: '45' })).toBe('Nota de crédito 45');
  });

  it('suma montos sin errores de redondeo', () => {
    expect(sumarMontos(['0.10', '0.20'])).toBe('0.30');
    expect(sumarMontos([])).toBe('0.00');
    expect(
      totalRetenido({ retenciones: [retencion(), retencion({ monto: '0.00' }), retencion({ monto: '12.34' })] }),
    ).toBe('162.34');
  });

  it('la línea se rotula con el concepto y la descripción, o con lo que haya', () => {
    const conceptos = new Map([['c-1', 'Repuestos']]);
    expect(nombreDeLinea(linea({ descripcion: 'Filtro' }), conceptos)).toBe('Repuestos: Filtro');
    expect(nombreDeLinea(linea(), conceptos)).toBe('Repuestos');
    expect(nombreDeLinea(linea({ descripcion: 'Filtro' }), new Map())).toBe('Filtro');
    expect(nombreDeLinea(linea(), new Map())).toBe('Concepto');
  });

  it('las cifras de la línea omiten IDP y exento en cero', () => {
    expect(cifrasDeLinea(linea()).map((c) => c.etiqueta)).toEqual([
      'Total',
      'Base (sin IVA)',
      'IVA',
      'IVA no acreditable',
      'Costo',
    ]);
    expect(cifrasDeLinea(linea({ idp: '4.70' })).map((c) => c.etiqueta)).toContain('IDP');
  });
});

describe('retenciones', () => {
  it('se nombran por su regla', () => {
    expect(nombreDeRetencion(retencion())).toBe('Retención de IVA: la empresa es contribuyente especial');
    expect(nombreDeRetencion(retencion({ regla: 'otra', impuesto: 'isr' }))).toBe('Retención de ISR');
  });

  it('dicen si el usuario las quitó, agregó o ajustó a mano', () => {
    expect(estadoDeRetencion(retencion())).toBeNull();
    expect(estadoDeRetencion(retencion({ monto: '0.00' }))).toBe('Quitada a mano');
    expect(estadoDeRetencion(retencion({ monto: '100.00' }))).toBe('Ajustada a mano');
    expect(estadoDeRetencion(retencion({ montoPropuesto: '0.00', monto: '80.00' }))).toBe('Agregada a mano');
  });

  it('el ISR por escalones no tiene porcentaje único', () => {
    expect(cifrasDeRetencion(retencion({ porcentaje: null }))[1]?.valor).toBe('Por tramos (5 % y 7 %)');
    expect(cifrasDeRetencion(retencion())[1]?.valor).toBe('15.00 %');
  });
});

describe('anular', () => {
  it('ofrece las causas por nombre, con la invitación a escoger primero', () => {
    expect(opcionesDeCausa().map((o) => o.valor)).toEqual([
      '',
      'fel_anulada_por_el_emisor',
      'error_de_captura',
      'no_corresponde_a_la_empresa',
    ]);
  });

  it('en una factura especial la causa del emisor dice que fue la empresa', () => {
    const textos = opcionesDeCausa('factura_especial').map((o) => o.texto);
    expect(textos).toContain('FESP anulada por la empresa');
    expect(textos).not.toContain('El emisor anuló la FEL en la SAT');
    expect(opcionesDeCausa('factura_especial')).toHaveLength(4);
  });

  it('pide la causa y el motivo', () => {
    expect(Object.keys(erroresDeAnulacion(edicionDeAnulacionVacia()))).toEqual(['causa', 'motivo']);
    const completa = { ...edicionDeAnulacionVacia(), causa: 'error_de_captura' as const, motivo: ' Se repitió ' };
    expect(erroresDeAnulacion(completa)).toEqual({});
    expect(datosDeAnulacion(completa)).toEqual({ causa: 'error_de_captura', motivo: 'Se repitió' });
  });

  it('rechaza un motivo de solo espacios o de más de 300 caracteres', () => {
    const base = { ...edicionDeAnulacionVacia(), causa: 'error_de_captura' as const };
    expect(erroresDeAnulacion({ ...base, motivo: '   ' }).motivo).toContain('Cuente');
    expect(erroresDeAnulacion({ ...base, motivo: 'x'.repeat(301) }).motivo).toContain('300');
  });

  it('el resumen dice qué se anula y aclara lo de la retenciones', () => {
    expect(resumenDeAnulacion(ficha())).toContain('Factura A-123 de Ferretería La Unión');
    expect(resumenDeAnulacion(ficha())).not.toContain('retenciones');
    expect(resumenDeAnulacion(ficha({ retenciones: [retencion()] }))).toContain('retenciones quedan guardadas');
  });

  it('la pregunta de eliminar advierte que no se deshace', () => {
    expect(mensajeDeEliminacion(ficha())).toContain('no se puede deshacer');
  });
});

describe('explicaciones de lo que no se ofrece', () => {
  it('con notas vigentes explica cómo anular', () => {
    const conNotas = ficha({
      puedeAnular: false,
      puedeEliminar: false,
      notas: [{ id: 'n-1', serie: null, numero: '1', fechaEmision: '2026-10-01', total: '10.00', estado: 'vigente' }],
    });
    expect(explicacionesDeAcciones(conNotas)).toHaveLength(2);
  });

  it('si ya lo procesó el destino, dice por qué no se elimina', () => {
    const procesada = ficha({ puedeEliminar: false, procesadoEnDestinoEn: '2026-10-02T15:00:00Z' });
    expect(explicacionesDeAcciones(procesada)[0]).toContain('el destino ya la procesó');
  });

  it('no dice nada si se puede todo o si ya está anulada', () => {
    expect(explicacionesDeAcciones(ficha())).toEqual([]);
    expect(explicacionesDeAcciones(ficha({ estado: 'anulado', puedeAnular: false, puedeEliminar: false }))).toEqual([]);
  });
});
