import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { Articulo, ConversionDeArticulo, Lote } from '../../servicios/articulos.api';

const porTexto = (a: OpcionDeRegistro, b: OpcionDeRegistro) => (a.texto ?? '').localeCompare(b.texto ?? '', 'es');

/** Los artículos activos por nombre, con su código para distinguirlos. */
export function opcionesDeArticulos(articulos: Articulo[]): OpcionDeRegistro[] {
  const opciones = articulos
    .filter((articulo) => articulo.activo)
    .map((articulo) => ({ valor: articulo.id as string | null, texto: `${articulo.nombre} (${articulo.codigo})` }))
    .sort(porTexto);
  return [{ valor: null, texto: 'Elija el artículo' }, ...opciones];
}

/** La unidad base y las unidades de empaque del artículo; la base va con `valor` nulo (el servidor la toma por omisión). */
export function opcionesDeUnidades(
  articulo: Articulo | null,
  conversiones: ConversionDeArticulo[],
): OpcionDeRegistro[] {
  if (!articulo) return [{ valor: null, texto: 'Unidad base' }];
  const base = { valor: null, texto: `${articulo.unidadBaseNombre ?? 'Unidad base'} (base)` };
  const empaques = conversiones.map((conversion) => ({
    valor: conversion.unidadId as string | null,
    texto: conversion.unidadNombre,
  }));
  return [base, ...empaques.sort(porTexto)];
}

/** Los lotes que vencen primero van primero (FEFO); los que no vencen, al final. */
export function lotesPorVencimiento(lotes: Lote[]): Lote[] {
  const clave = (lote: Lote) => lote.fechaDeVencimiento ?? '9999-12-31';
  return [...lotes].sort((a, b) => clave(a).localeCompare(clave(b)) || a.codigo.localeCompare(b.codigo, 'es'));
}

/** El texto de un lote: su código y cuándo vence, marcando el vencido. */
export function textoDeLote(lote: Lote, hoy: string): string {
  if (!lote.fechaDeVencimiento) return lote.codigo;
  const vencido = lote.fechaDeVencimiento < hoy ? ' · vencido' : '';
  return `${lote.codigo} (vence ${formatearFecha(lote.fechaDeVencimiento)}${vencido})`;
}

export function opcionesDeLotes(lotes: Lote[], hoy: string): OpcionDeRegistro[] {
  return [
    { valor: null, texto: 'Elija el lote' },
    ...lotesPorVencimiento(lotes).map((lote) => ({ valor: lote.id as string | null, texto: textoDeLote(lote, hoy) })),
  ];
}

/** En una salida se propone el lote que vence primero y todavía no venció (FEFO); el usuario puede cambiarlo. */
export function lotePropuesto(lotes: Lote[], hoy: string): string | null {
  const vigentes = lotesPorVencimiento(lotes).filter(
    (lote) => !lote.fechaDeVencimiento || lote.fechaDeVencimiento >= hoy,
  );
  return vigentes[0]?.id ?? null;
}
