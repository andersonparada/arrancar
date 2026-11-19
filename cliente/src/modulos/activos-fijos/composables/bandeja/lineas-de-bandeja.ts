import { centavosDeTexto, textoDeCentavos } from './montos-de-bandeja';
import type { FiltrosDeBandeja, LineaDeBandeja } from '../../servicios/bandeja.api';

/** Las líneas de un mismo documento del libro. */
export interface GrupoDeDocumento {
  documentoId: string;
  titulo: string;
  proveedorNombre: string;
  fechaEmision: string;
  lineas: LineaDeBandeja[];
}

const TIPOS_DE_DOCUMENTO: Record<string, string> = {
  factura: 'Factura',
  nota_de_credito: 'Nota de crédito',
  nota_de_debito: 'Nota de débito',
};

/** El tipo de documento con su nombre; uno que no se conozca se muestra legible, sin guiones bajos. */
export function etiquetaDeDocumento(tipo: string): string {
  const conocido = TIPOS_DE_DOCUMENTO[tipo];
  if (conocido) return conocido;
  const texto = tipo.replaceAll('_', ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Las notas (de crédito o de débito) fijan solas su clase de costo; la de crédito resta. */
export const esNotaDelLibro = (linea: Pick<LineaDeBandeja, 'tipoDeDocumento'>): boolean =>
  linea.tipoDeDocumento.startsWith('nota_');

/** La línea resta del costo del activo: el pendiente de una nota de crédito es negativo. */
export const restaDelCosto = (linea: Pick<LineaDeBandeja, 'costo'>): boolean => (centavosDeTexto(linea.costo) ?? 0) < 0;

/** Agrupa por documento, en el orden en que llegan las líneas (el servidor ya las ordena). */
export function agruparPorDocumento(lineas: readonly LineaDeBandeja[]): GrupoDeDocumento[] {
  const grupos = new Map<string, GrupoDeDocumento>();
  for (const linea of lineas) {
    const grupo = grupos.get(linea.documentoId) ?? {
      documentoId: linea.documentoId,
      titulo: `${etiquetaDeDocumento(linea.tipoDeDocumento)} ${linea.documento}`,
      proveedorNombre: linea.proveedorNombre,
      fechaEmision: linea.fechaEmision,
      lineas: [],
    };
    grupo.lineas.push(linea);
    grupos.set(linea.documentoId, grupo);
  }
  return [...grupos.values()];
}

const textoDeBusqueda = (linea: LineaDeBandeja): string =>
  [linea.documento, linea.proveedorNombre, linea.conceptoNombre, linea.descripcion ?? ''].join(' ').toLowerCase();

/** Las líneas que contienen lo escrito (en documento, proveedor, concepto o descripción); vacío deja todas. */
export function filtrarPorTexto(lineas: readonly LineaDeBandeja[], texto: string): LineaDeBandeja[] {
  const buscado = texto.trim().toLowerCase();
  return buscado ? lineas.filter((linea) => textoDeBusqueda(linea).includes(buscado)) : [...lineas];
}

/** Suma de lo pendiente de las líneas, en quetzales con dos decimales. */
export function totalPendiente(lineas: readonly LineaDeBandeja[]): string {
  return textoDeCentavos(lineas.reduce((suma, linea) => suma + (centavosDeTexto(linea.pendiente) ?? 0), 0));
}

/** Lo que filtra el servidor, sin los campos vacíos. */
export interface FiltrosEscritos {
  desde: string;
  hasta: string;
  propuesta: 'todas' | 'con' | 'sin';
}

export const filtrosDeBandejaVacios = (): FiltrosEscritos => ({ desde: '', hasta: '', propuesta: 'todas' });

/** La consulta al servidor con los filtros escritos. */
export function consultaDeBandeja(filtros: FiltrosEscritos): FiltrosDeBandeja {
  return {
    desde: filtros.desde || undefined,
    hasta: filtros.hasta || undefined,
    conPropuesta: filtros.propuesta === 'todas' ? undefined : filtros.propuesta === 'con',
  };
}

/** Si hay algún filtro o búsqueda puesto, para decirlo en el estado vacío. */
export const hayFiltrosEscritos = (filtros: FiltrosEscritos, texto: string): boolean =>
  Boolean(texto.trim() || filtros.desde || filtros.hasta || filtros.propuesta !== 'todas');
