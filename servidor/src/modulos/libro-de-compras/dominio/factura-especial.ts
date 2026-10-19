import { Nit, NitInvalido } from '../../core/compartido/dominio/objetos-valor/nit.js';
import type { DatosFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import type { DatosFiscalesDeProveedor } from './datos-fiscales-de-proveedor.js';
import { DatosDeLaFelIncompletos } from './errores-de-documento.js';
import { VendedorDeFacturaEspecialInvalido, VendedorNoCoincide } from './errores-de-factura-especial.js';
import { receptorDelDocumento } from './reglas-del-encabezado.js';

export const AVISO_DE_EMPRESA_SIN_CONTABILIDAD_COMPLETA =
  'Su empresa no lleva contabilidad completa: confirme con su contador la retención del ISR (Decreto 10-2012 art. 16).';
export const AVISO_DE_EMPRESA_NO_AFILIADA =
  'Su empresa no está afiliada al IVA: confirme su habilitación como emisora de facturas especiales.';
export const AVISO_DE_PROVEEDOR_INSCRITO =
  'No se emite factura especial entre contribuyentes del IVA, salvo que conste la negativa del vendedor a facturar (Ley del IVA art. 52).';
export const AVISO_DE_FACTURA_ESPECIFICA =
  'Si compra productos agropecuarios a un productor del régimen primario o pecuario, puede corresponder la factura específica (FEPE).';

/** Lo que dice el documento y lo que Terceros sabe del proveedor para identificar al vendedor. */
export interface DatosDeLaFacturaEspecial {
  nitDeLaEmpresa: string;
  /** El NIT o CUI del vendedor tal como lo escribió el usuario (`nitReceptor`). */
  vendedor: string | null;
  serie: string | null;
  autorizacionFel: string | null;
  /** NIT y DPI del proveedor en Terceros, normalizados; `null` si no tiene. */
  proveedor: { nit: string | null; dpi: string | null };
}

export interface FacturaEspecialResuelta {
  /** El NIT de la empresa: la empresa emite la factura especial. */
  nitEmisor: string;
  /** El NIT o CUI del vendedor, normalizado. */
  nitReceptor: string;
  /** El proveedor no tenía NIT ni DPI y el vendedor es un NIT: hay que mandarle `terceros.completar_nit`. */
  nitParaCompletar: string | null;
  /** El proveedor no tenía NIT ni DPI y el vendedor es un CUI: hay que mandarle `terceros.completar_dpi`. */
  dpiParaCompletar: string | null;
}

function esNit(valor: string): boolean {
  try {
    Nit.crear(valor);
    return true;
  } catch (error) {
    if (error instanceof NitInvalido) return false;
    throw error;
  }
}

function exigirSerieYAutorizacion(datos: DatosDeLaFacturaEspecial): void {
  const faltantes = [
    datos.serie ? null : 'la serie',
    datos.autorizacionFel ? null : 'la autorización de la FEL',
  ].filter((falta) => falta !== null);
  if (faltantes.length > 0) {
    throw new DatosDeLaFelIncompletos(`Una factura especial necesita ${faltantes.join(' y ')}.`);
  }
}

function vendedorValido(datos: DatosDeLaFacturaEspecial): string {
  const vendedor = receptorDelDocumento(datos.vendedor);
  if (vendedor === null) throw new VendedorDeFacturaEspecialInvalido('Escriba el NIT o CUI del vendedor.');
  if (vendedor === 'CF') throw new VendedorDeFacturaEspecialInvalido('El vendedor no puede ser consumidor final.');
  if (vendedor === datos.nitDeLaEmpresa) {
    throw new VendedorDeFacturaEspecialInvalido('El vendedor no puede ser la propia empresa.');
  }
  return vendedor;
}

/**
 * El encabezado de una factura especial (Ley del IVA art. 52): emite la empresa, así que `nit_emisor` es el NIT de la
 * empresa y el vendedor (el proveedor) se identifica en `nit_receptor` por NIT o CUI. Lo escrito debe coincidir con
 * el NIT o el DPI del proveedor; si no tiene ninguno de los dos se le completa con el escrito.
 * @throws DatosDeLaFelIncompletos, ReceptorInvalido, VendedorDeFacturaEspecialInvalido o VendedorNoCoincide.
 */
export function resolverFacturaEspecial(datos: DatosDeLaFacturaEspecial): FacturaEspecialResuelta {
  exigirSerieYAutorizacion(datos);
  const vendedor = vendedorValido(datos);
  const { nit, dpi } = datos.proveedor;
  const base = { nitEmisor: datos.nitDeLaEmpresa, nitReceptor: vendedor };
  if (vendedor === nit || vendedor === dpi) return { ...base, nitParaCompletar: null, dpiParaCompletar: null };
  if (nit !== null || dpi !== null) throw new VendedorNoCoincide();
  const esDeNit = esNit(vendedor);
  return { ...base, nitParaCompletar: esDeNit ? vendedor : null, dpiParaCompletar: esDeNit ? null : vendedor };
}

/**
 * Avisos de la factura especial, que no bloquean: la empresa sin contabilidad completa o no afiliada, el proveedor
 * inscrito en el IVA (art. 52) y siempre la mención de la factura específica.
 */
export function avisosDeLaFacturaEspecial(datos: {
  empresa: DatosFiscalesDeEmpresa;
  proveedor: DatosFiscalesDeProveedor;
}): string[] {
  const empresa = datos.empresa.instantanea();
  return [
    ...(empresa.esAgenteDeRetencionIsr ? [] : [AVISO_DE_EMPRESA_SIN_CONTABILIDAD_COMPLETA]),
    ...(empresa.regimenIva === 'no_afiliado' ? [AVISO_DE_EMPRESA_NO_AFILIADA] : []),
    ...(datos.proveedor.instantanea().regimenIva === 'sin_inscripcion' ? [] : [AVISO_DE_PROVEEDOR_INSCRITO]),
    AVISO_DE_FACTURA_ESPECIFICA,
  ];
}
