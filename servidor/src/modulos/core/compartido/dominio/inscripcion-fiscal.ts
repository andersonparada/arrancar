import { esNitValido, normalizarNit } from './objetos-valor/nit.js';

/** Lo que se sabe de la empresa para deducir si está inscrita (§3.9 de Ventas y caja). */
export interface DatosDeInscripcion {
  /** `core.empresas.nit`, como esté guardado; `null` si no tiene. */
  nit: string | null;
  /** La empresa tiene alguna fila en `libro_de_compras.datos_fiscales_de_empresa`, aunque el módulo esté apagado. */
  tieneHistorialFiscal: boolean;
}

/** Cómo quedó la empresa frente a sus salvaguardas, según la tabla de §3.9. */
export type SituacionDeInscripcion =
  'sin_inscripcion' | 'inscrita_con_datos_fiscales' | 'inscrita_sin_datos_fiscales' | 'sin_nit_con_historial_fiscal';

/** Un NIT cuenta si es válido y no es `CF`: el objeto `Nit` acepta `CF`, pero no identifica a un contribuyente. */
export function tieneNitDeContribuyente(nit: string | null): boolean {
  if (!nit?.trim()) return false;
  const normalizado = normalizarNit(nit);
  return normalizado !== 'CF' && esNitValido(normalizado);
}

/**
 * La empresa está inscrita si tiene un NIT de contribuyente o tiene historial fiscal. No hay un «modo»
 * ni una columna: quitar el NIT no apaga las salvaguardas si ya hubo datos fiscales (CV-11).
 */
export function estaInscrita({ nit, tieneHistorialFiscal }: DatosDeInscripcion): boolean {
  return tieneNitDeContribuyente(nit) || tieneHistorialFiscal;
}

/** Una de las cuatro filas de la tabla de §3.9; de ella dependen los avisos de IVA de Inventarios. */
export function situacionDeInscripcion({ nit, tieneHistorialFiscal }: DatosDeInscripcion): SituacionDeInscripcion {
  if (!tieneNitDeContribuyente(nit)) return tieneHistorialFiscal ? 'sin_nit_con_historial_fiscal' : 'sin_inscripcion';
  return tieneHistorialFiscal ? 'inscrita_con_datos_fiscales' : 'inscrita_sin_datos_fiscales';
}
