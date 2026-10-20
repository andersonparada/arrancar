import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { AnuladoDelLibro } from '../../dominio/libro/documento-del-libro.js';
import {
  COLUMNAS_DE_DINERO,
  type ColumnaDeDinero,
  type FilaDelLibro,
  type MontosDelLibro,
} from '../../dominio/libro/fila-del-libro.js';
import type { LibroDelPeriodo } from '../../dominio/libro/libro-del-periodo.js';
import { LEYENDA_DE_MOTIVOS } from '../../dominio/libro/motivos-del-libro.js';
import type { MotivoSinCredito } from '../../dominio/tipos-de-documento.js';

/** Los montos de la fila y del resumen viajan como texto con dos decimales y con signo. */
export type MontosEnTexto = Record<ColumnaDeDinero, string>;
export type FilaDelLibroDto = Omit<FilaDelLibro, ColumnaDeDinero> & MontosEnTexto;

export interface LibroDto {
  tipoDeLibro: 'completo' | 'simplificado';
  periodo: string;
  empresa: { nombre: string; nit: string | null };
  filas: FilaDelLibroDto[];
  resumen: {
    totales: MontosEnTexto;
    porTipoDte: Array<{ tipoDte: string | null; cantidad: number; total: string }>;
    creditoFiscalDelPeriodo: string;
    ivaSinCreditoPorMotivo: Array<{ motivo: MotivoSinCredito; ivaSinCredito: string }>;
    combustibles: { base: string; idp: string; iva: string; exentoPorDecreto: string };
  };
  avisos: string[];
  leyenda: ReadonlyArray<{ sigla: string; descripcion: string }>;
}

export interface AnuladoDelLibroDto extends Omit<AnuladoDelLibro, 'total' | 'iva'> {
  total: string;
  iva: string;
}

function montosEnTexto(montos: MontosDelLibro): MontosEnTexto {
  return Object.fromEntries(
    COLUMNAS_DE_DINERO.map((columna) => [columna, deCentavos(montos[columna])]),
  ) as MontosEnTexto;
}

const filaEnTexto = (fila: FilaDelLibro): FilaDelLibroDto => ({ ...fila, ...montosEnTexto(fila) });

function resumenEnTexto(resumen: LibroDelPeriodo['resumen']): LibroDto['resumen'] {
  return {
    totales: montosEnTexto(resumen.totales),
    porTipoDte: resumen.porTipoDte.map((grupo) => ({ ...grupo, total: deCentavos(grupo.total) })),
    creditoFiscalDelPeriodo: deCentavos(resumen.creditoFiscalDelPeriodo),
    ivaSinCreditoPorMotivo: resumen.ivaSinCreditoPorMotivo.map((grupo) => ({
      ...grupo,
      ivaSinCredito: deCentavos(grupo.ivaSinCredito),
    })),
    combustibles: {
      base: deCentavos(resumen.combustibles.base),
      idp: deCentavos(resumen.combustibles.idp),
      iva: deCentavos(resumen.combustibles.iva),
      exentoPorDecreto: deCentavos(resumen.combustibles.exentoPorDecreto),
    },
  };
}

/** El libro del período en la forma que sale por la API. */
export function dtoDelLibro(
  libro: LibroDelPeriodo,
  contexto: { periodo: string; empresa: LibroDto['empresa'] },
): LibroDto {
  return {
    tipoDeLibro: libro.tipoDeLibro,
    periodo: contexto.periodo,
    empresa: contexto.empresa,
    filas: libro.filas.map(filaEnTexto),
    resumen: resumenEnTexto(libro.resumen),
    avisos: libro.avisos,
    leyenda: LEYENDA_DE_MOTIVOS,
  };
}

export const dtoDeAnulado = (anulado: AnuladoDelLibro): AnuladoDelLibroDto => ({
  ...anulado,
  total: deCentavos(anulado.total),
  iva: deCentavos(anulado.iva),
});
