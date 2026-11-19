import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { PlazoDeProveedor } from '../../servicios/plazos.api';

const sinTildes = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Los días de crédito como se leen: «30 días», «1 día», «De contado» o, sin días propios, el plazo por omisión. */
export function textoDeLosDias(dias: number | null): string {
  if (dias === null) return 'Plazo por omisión de la empresa';
  if (dias === 0) return 'De contado';
  return `${dias} ${dias === 1 ? 'día' : 'días'}`;
}

export const textoDesdeCuando = (contarDesdeLaRecepcion: boolean): string =>
  contarDesdeLaRecepcion ? 'La recepción' : 'La emisión';

/** Los plazos por nombre del proveedor (sin importar mayúsculas ni tildes). */
export const ordenarPorProveedor = (plazos: PlazoDeProveedor[]): PlazoDeProveedor[] =>
  [...plazos].sort((a, b) => a.proveedorNombre.localeCompare(b.proveedorNombre, 'es'));

/** Los que coinciden con lo escrito en el nombre o en el NIT; vacío deja todos. */
export function filtrarPlazos(plazos: PlazoDeProveedor[], texto: string): PlazoDeProveedor[] {
  const buscado = sinTildes(texto.trim());
  if (!buscado) return plazos;
  return plazos.filter((plazo) => sinTildes(`${plazo.proveedorNombre} ${plazo.nit ?? ''}`).includes(buscado));
}

/** Los datos de la tarjeta de un proveedor. */
export const detallesDelPlazo = (plazo: PlazoDeProveedor): DetalleDeRegistro[] => [
  { etiqueta: 'NIT', valor: plazo.nit ?? 'Sin NIT' },
  { etiqueta: 'Días de crédito', valor: textoDeLosDias(plazo.diasDeCredito) },
  { etiqueta: 'Se cuentan desde', valor: textoDesdeCuando(plazo.contarDesdeLaRecepcion) },
];
