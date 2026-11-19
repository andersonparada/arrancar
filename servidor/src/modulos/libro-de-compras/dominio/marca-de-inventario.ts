import { DocumentoYaAnulado } from './errores-de-baja.js';
import { InventarioNoEsBien, LineaConDosDestinosDelCosto } from './errores-de-documento.js';

/** Lo que el libro necesita de una línea para cambiarle la marca de inventario. */
export interface LineaParaMarcar {
  lineaId: string;
  documentoId: string;
  documentoVigente: boolean;
  numero: number;
  tipo: 'bien' | 'servicio';
  esActivoFijo: boolean;
  esInventario: boolean;
}

/**
 * La marca de inventario se puede cambiar en una línea de un documento vigente. Quitarla siempre se puede (la línea
 * vuelve a ser gasto con su concepto); ponerla exige un bien que no sea activo fijo.
 * @throws DocumentoYaAnulado si el documento está anulado.
 * @throws InventarioNoEsBien si se pone la marca a un servicio.
 * @throws LineaConDosDestinosDelCosto si se pone la marca a una línea de activo fijo.
 */
export function exigirMarcaCambiable(linea: LineaParaMarcar, esInventario: boolean): void {
  if (!linea.documentoVigente) throw new DocumentoYaAnulado();
  if (!esInventario) return;
  if (linea.tipo !== 'bien') throw new InventarioNoEsBien(linea.numero);
  if (linea.esActivoFijo) throw new LineaConDosDestinosDelCosto(linea.numero);
}
