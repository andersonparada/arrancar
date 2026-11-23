import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type { RenglonSolicitado } from '../../servicios/documentos.api';
import type { Articulo } from '../../servicios/articulos.api';
import { esCantidadPositiva, esMontoValido } from '../compartido/cantidades';

/** Un renglón mientras se escribe. `clave` lo distingue en la lista aunque se quiten otros. */
export interface EdicionDeRenglon {
  clave: number;
  articuloId: string | null;
  loteId: string | null;
  cantidad: string;
  /** `null` es la unidad base del artículo. */
  unidadId: string | null;
  costoTotal: string;
}

let siguienteClave = 1;

export const renglonNuevo = (articuloId: string | null = null, cantidad = ''): EdicionDeRenglon => ({
  clave: siguienteClave++,
  articuloId,
  loteId: null,
  cantidad,
  unidadId: null,
  costoTotal: '',
});

/** Lo que se manda por renglón; el costo solo viaja en las entradas. */
export function renglonesSolicitados(renglones: EdicionDeRenglon[], conCosto: boolean): RenglonSolicitado[] {
  return renglones.map((renglon) => ({
    articuloId: renglon.articuloId ?? '',
    loteId: renglon.loteId,
    cantidad: String(renglon.cantidad).trim(),
    unidadId: renglon.unidadId,
    costoTotal: conCosto ? textoONulo(renglon.costoTotal) : null,
  }));
}

/**
 * Lo que falta o está mal en los renglones, por campo (`renglones.<n>.<campo>`), con el mensaje que dice cómo
 * corregirlo. Las reglas de negocio (existencias, meses cerrados, costo cero) las decide el servidor.
 */
export function erroresDeRenglones(renglones: EdicionDeRenglon[], conCosto: boolean): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!renglones.length) errores.renglones = 'Agregue al menos un artículo.';
  renglones.forEach((renglon, indice) => {
    const clave = (campo: string) => `renglones.${indice}.${campo}`;
    if (!renglon.articuloId) errores[clave('articuloId')] = 'Elija el artículo.';
    if (!esCantidadPositiva(renglon.cantidad)) {
      errores[clave('cantidad')] = 'Escriba una cantidad mayor que cero, con hasta 4 decimales.';
    }
    const costo = String(renglon.costoTotal ?? '').trim();
    if (conCosto && costo && !esMontoValido(costo)) {
      errores[clave('costoTotal')] = 'Escriba el costo total del renglón con hasta 2 decimales, por ejemplo 125.50.';
    }
  });
  return errores;
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** El artículo que corresponde a lo que lee el lector de códigos (o lo que se escribe): código de barras o código. */
export function articuloDeCodigo(articulos: Articulo[], leido: string): Articulo | null {
  const buscado = normalizar(leido.trim());
  if (!buscado) return null;
  const activos = articulos.filter((articulo) => articulo.activo);
  const exacto = (campo: string | null) => campo !== null && normalizar(campo) === buscado;
  return (
    activos.find((articulo) => exacto(articulo.codigoDeBarras)) ??
    activos.find((articulo) => exacto(articulo.codigo)) ??
    null
  );
}

/**
 * Agrega el artículo leído: si ya hay un renglón suyo sin cantidad escrita o con cantidad, suma 1; si no, crea uno
 * con cantidad 1. Así escanear tres veces el mismo código da cantidad 3.
 */
export function agregarLeido(renglones: EdicionDeRenglon[], articuloId: string): EdicionDeRenglon[] {
  const existente = renglones.find((renglon) => renglon.articuloId === articuloId && renglon.unidadId === null);
  if (!existente) return [...renglones, renglonNuevo(articuloId, '1')];
  const actual = Number(existente.cantidad);
  const siguiente = Number.isFinite(actual) && existente.cantidad !== '' ? actual + 1 : 1;
  return renglones.map((renglon) =>
    renglon === existente ? { ...renglon, cantidad: String(Math.round(siguiente * 10000) / 10000) } : renglon,
  );
}

/** Quita los renglones vacíos (sin artículo ni cantidad) que dejó el formulario al abrirse. */
export const sinRenglonesVacios = (renglones: EdicionDeRenglon[]): EdicionDeRenglon[] =>
  renglones.filter((renglon) => renglon.articuloId || String(renglon.cantidad).trim());
