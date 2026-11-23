import { sumarDecimales } from '../compartido/cantidades';
import type { LineaPorRecibir } from '../../servicios/recepciones.api';

/** Las líneas de un mismo documento del Libro de compras, para mostrarlas juntas. */
export interface DocumentoPorRecibir {
  documentoId: string;
  documento: string;
  tipoDeDocumento: string;
  fechaEmision: string;
  proveedorNombre: string;
  lineas: LineaPorRecibir[];
  pendiente: string;
}

/** Las notas de crédito no se reciben: se aplican con una devolución o una rebaja. */
export const esNotaDeCredito = (linea: Pick<LineaPorRecibir, 'tipoDeDocumento'>): boolean =>
  linea.tipoDeDocumento === 'nota_de_credito';

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Las líneas cuyo documento, proveedor, concepto o descripción contienen lo escrito (sin tildes ni mayúsculas). */
export function filtrarLineas(lineas: LineaPorRecibir[], texto: string): LineaPorRecibir[] {
  const buscado = normalizar(texto.trim());
  if (!buscado) return lineas;
  return lineas.filter((linea) =>
    normalizar(
      [linea.documento, linea.proveedorNombre, linea.conceptoNombre, linea.descripcion ?? ''].join(' '),
    ).includes(buscado),
  );
}

/** Junta las líneas por documento: los más antiguos primero (los que llevan más tiempo esperando), y las líneas en orden. */
export function agruparPorDocumento(lineas: LineaPorRecibir[]): DocumentoPorRecibir[] {
  const porDocumento = new Map<string, LineaPorRecibir[]>();
  for (const linea of lineas) {
    porDocumento.set(linea.documentoId, [...(porDocumento.get(linea.documentoId) ?? []), linea]);
  }
  return [...porDocumento.values()]
    .map((delDocumento) => {
      const ordenadas = [...delDocumento].sort((a, b) => a.numeroDeLinea - b.numeroDeLinea);
      const [primera] = ordenadas as [LineaPorRecibir, ...LineaPorRecibir[]];
      return {
        documentoId: primera.documentoId,
        documento: primera.documento,
        tipoDeDocumento: primera.tipoDeDocumento,
        fechaEmision: primera.fechaEmision,
        proveedorNombre: primera.proveedorNombre,
        lineas: ordenadas,
        pendiente: sumarDecimales(
          ordenadas.map((linea) => linea.pendiente),
          2,
        )!,
      };
    })
    .sort((a, b) => a.fechaEmision.localeCompare(b.fechaEmision) || a.documento.localeCompare(b.documento, 'es'));
}

/** Las líneas elegidas, en el orden de la lista; ignora lo que ya no está (se recibió o se descartó). */
export const lineasElegidas = (lineas: LineaPorRecibir[], seleccion: string[]): LineaPorRecibir[] =>
  lineas.filter((linea) => seleccion.includes(linea.lineaId));
