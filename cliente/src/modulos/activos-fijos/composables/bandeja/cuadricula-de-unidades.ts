import type { DetalleDeUnidad } from '../../servicios/bandeja.api';
import { textoONulo } from '@/modulos/core/utilidades/edicion';

/** Un renglón de la cuadrícula: lo que el operador escribe de cada unidad. */
export interface RenglonDeUnidad {
  codigo: string;
  numeroDeSerie: string;
  placa: string;
  marca: string;
  modelo: string;
}

export const renglonVacio = (): RenglonDeUnidad => ({
  codigo: '',
  numeroDeSerie: '',
  placa: '',
  marca: '',
  modelo: '',
});

const esVacio = (renglon: RenglonDeUnidad): boolean => Object.values(renglon).every((valor) => !valor.trim());

/**
 * La cuadrícula con exactamente `unidades` renglones: si crece, se agregan vacíos; si se encoge, se quitan los
 * últimos. Lo ya escrito en los demás se conserva.
 */
export function ajustarCuadricula(renglones: readonly RenglonDeUnidad[], unidades: number): RenglonDeUnidad[] {
  const cantidad = Number.isInteger(unidades) && unidades > 0 ? unidades : 0;
  return Array.from({ length: cantidad }, (_, indice) => renglones[indice] ?? renglonVacio());
}

/** Posiciones de los códigos escritos que se repiten dentro de la cuadrícula (sin distinguir mayúsculas). */
export function posicionesRepetidas(renglones: readonly RenglonDeUnidad[]): Set<number> {
  const cuenta = new Map<string, number>();
  const claves = renglones.map(({ codigo }) => codigo.trim().toUpperCase());
  for (const clave of claves) if (clave) cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
  return new Set(claves.flatMap((clave, indice) => ((cuenta.get(clave) ?? 0) > 1 ? [indice] : [])));
}

/**
 * Lo que se manda: nada si no se escribió nada (el servidor propone los códigos); si no, un renglón por unidad,
 * con lo vacío como `null`.
 */
export function detalleParaEnviar(renglones: readonly RenglonDeUnidad[]): DetalleDeUnidad[] {
  if (renglones.every(esVacio)) return [];
  return renglones.map((renglon) => ({
    codigo: textoONulo(renglon.codigo),
    numeroDeSerie: textoONulo(renglon.numeroDeSerie),
    placa: textoONulo(renglon.placa),
    marca: textoONulo(renglon.marca),
    modelo: textoONulo(renglon.modelo),
  }));
}

/** Cuántos renglones quedaron sin número de serie: el reporte de existencias los marca «sin serie». */
export const unidadesSinSerie = (renglones: readonly RenglonDeUnidad[]): number =>
  renglones.filter(({ numeroDeSerie }) => !numeroDeSerie.trim()).length;
