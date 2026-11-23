import { ANCHO_UTIL, MARGEN, type ColumnaDeTabla } from '../../../core/impresion/pdf/tabla-del-pdf.js';
import {
  COLUMNAS_DEL_LIBRO,
  esCampoDeTexto,
  textoDelCampo,
  type CampoDelLibro,
} from '../../dominio/libro/columnas-del-libro.js';
import type { FilaDelLibro, MontosDelLibro } from '../../dominio/libro/fila-del-libro.js';
import type { TipoDeLibro } from '../../dominio/libro/tipo-de-libro.js';

const ANCHO_DE_TEXTO: Partial<Record<CampoDelLibro, number>> = {
  numeroDeFila: 24,
  fecha: 46,
  tipoDte: 28,
  serie: 32,
  numero: 48,
  nit: 52,
  siglaDelMotivo: 24,
};
const MAXIMO_DE_TEXTO: Partial<Record<CampoDelLibro, number>> = { serie: 20, numero: 30, nit: 20, siglaDelMotivo: 6 };

export type ColumnaDeLaTabla = ColumnaDeTabla<FilaDelLibro, MontosDelLibro>;

function columnaDe(campo: CampoDelLibro, titulo: string, lugar: { x: number; ancho: number }): ColumnaDeLaTabla {
  const base = { titulo, ...lugar };
  if (campo === 'nombre') return { ...base, etiqueta: true, texto: (fila) => textoDelCampo(fila, campo) };
  if (!esCampoDeTexto(campo)) return { ...base, monto: (origen) => origen[campo] };
  const maximo = MAXIMO_DE_TEXTO[campo];
  const alinear = campo === 'numeroDeFila' ? 'right' : 'left';
  return { ...base, alinear, ...(maximo ? { maximo } : {}), texto: (fila) => textoDelCampo(fila, campo) };
}

/** Reparte el ancho útil: columnas fijas, dinero parejo y el nombre del proveedor con lo que sobra. */
export function columnasDeLaTabla(tipo: TipoDeLibro): ColumnaDeLaTabla[] {
  const columnas = COLUMNAS_DEL_LIBRO[tipo];
  const anchoDeDinero = tipo === 'completo' ? 50 : 60;
  const anchoFijo = (campo: CampoDelLibro) => (esCampoDeTexto(campo) ? (ANCHO_DE_TEXTO[campo] ?? 0) : anchoDeDinero);
  const fijos = columnas.reduce((suma, c) => suma + anchoFijo(c.campo), 0);
  let x = MARGEN;
  return columnas.map(({ titulo, campo }) => {
    const ancho = campo === 'nombre' ? ANCHO_UTIL - fijos : anchoFijo(campo);
    const columna = columnaDe(campo, titulo, { x, ancho });
    x += ancho;
    return columna;
  });
}
