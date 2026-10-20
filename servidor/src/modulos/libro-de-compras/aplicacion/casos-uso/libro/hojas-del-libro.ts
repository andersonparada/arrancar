import type { HojaSimple } from '../../../../core/intercambio/aplicacion/puertos/libro-de-excel.js';
import { COLUMNAS_DEL_LIBRO, esCampoDeTexto } from '../../../dominio/libro/columnas-del-libro.js';
import type { AnuladoDelLibro } from '../../../dominio/libro/documento-del-libro.js';
import type { ColumnaDeDinero, FilaDelLibro } from '../../../dominio/libro/fila-del-libro.js';
import { LEYENDA_DE_MOTIVOS } from '../../../dominio/libro/motivos-del-libro.js';
import type { LibroArmado } from './consultar-libro.js';

/** Excel recibe el dinero como número con dos decimales; los centavos son enteros, así que no hay error de suma. */
const quetzales = (centavos: number): number => centavos / 100;

function hojaDelLibro({ libro }: LibroArmado): HojaSimple {
  const columnas = COLUMNAS_DEL_LIBRO[libro.tipoDeLibro];
  const celda = (fila: FilaDelLibro, campo: (typeof columnas)[number]['campo']) =>
    esCampoDeTexto(campo) ? (fila[campo] ?? '') : quetzales(fila[campo]);
  return {
    nombre: 'Libro',
    encabezados: columnas.map((columna) => columna.titulo),
    filas: libro.filas.map((fila) => columnas.map((columna) => celda(fila, columna.campo))),
  };
}

const ENCABEZADOS_DEL_RESUMEN = ['Concepto', 'Valor'];

function datosDeLaEmpresa({ empresa, periodo, libro }: LibroArmado): unknown[][] {
  return [
    ['Empresa', empresa.nombre],
    ['NIT', empresa.nit ?? ''],
    ['Período', periodo.slice(0, 7)],
    ['Libro', libro.tipoDeLibro === 'completo' ? 'Completo' : 'Simplificado'],
  ];
}

function totalesDelPeriodo({ libro }: LibroArmado): unknown[][] {
  const { resumen } = libro;
  const montos = COLUMNAS_DEL_LIBRO[libro.tipoDeLibro].filter((c) => !esCampoDeTexto(c.campo));
  return [
    ['Totales del período', ''],
    ...montos.map((c) => [c.titulo, quetzales(resumen.totales[c.campo as ColumnaDeDinero])]),
    [],
    ['Crédito fiscal del período', quetzales(resumen.creditoFiscalDelPeriodo)],
  ];
}

function gruposDelResumen({ libro }: LibroArmado): unknown[][] {
  const { resumen } = libro;
  return [
    ['Por tipo de documento', 'Cantidad', 'Total'],
    ...resumen.porTipoDte.map((g) => [g.tipoDte ?? 'Sin tipo', g.cantidad, quetzales(g.total)]),
    [],
    ['IVA sin crédito por motivo', ''],
    ...resumen.ivaSinCreditoPorMotivo.map((g) => [g.motivo, quetzales(g.ivaSinCredito)]),
    [],
    ['Combustibles', ''],
    ['Base', quetzales(resumen.combustibles.base)],
    ['IDP', quetzales(resumen.combustibles.idp)],
    ['IVA', quetzales(resumen.combustibles.iva)],
    ['Exento por el Decreto 22-2026', quetzales(resumen.combustibles.exentoPorDecreto)],
  ];
}

function hojaDelResumen(armado: LibroArmado): HojaSimple {
  const leyenda = LEYENDA_DE_MOTIVOS.map((l) => [l.sigla, l.descripcion]);
  const bloques = [
    datosDeLaEmpresa(armado),
    totalesDelPeriodo(armado),
    gruposDelResumen(armado),
    [['Leyenda de motivos', ''], ...leyenda],
  ];
  const filas = bloques.flatMap((bloque, indice) => (indice === 0 ? bloque : [[], ...bloque]));
  return { nombre: 'Resumen', encabezados: ENCABEZADOS_DEL_RESUMEN, filas };
}

function hojaDeAnulados(anulados: AnuladoDelLibro[]): HojaSimple {
  return {
    nombre: 'Anulados',
    encabezados: ['Fecha', 'Tipo', 'Serie', 'Número', 'NIT', 'Proveedor', 'Total', 'IVA', 'Causa', 'Motivo', 'Anulado'],
    filas: anulados.map((a) => [
      a.fechaEmision,
      a.tipoDte ?? '',
      a.serie ?? '',
      a.numero,
      a.nitDelProveedor ?? '',
      a.nombreDelProveedor,
      quetzales(a.total),
      quetzales(a.iva),
      a.causaDeAnulacion ?? '',
      a.motivoDeAnulacion ?? '',
      a.anuladoEn ?? '',
    ]),
  };
}

/** Las tres hojas del Excel del libro: Libro, Resumen y Anulados (el anexo no suma al libro). */
export const hojasDelLibro = (armado: LibroArmado, anulados: AnuladoDelLibro[]): HojaSimple[] => [
  hojaDelLibro(armado),
  hojaDelResumen(armado),
  hojaDeAnulados(anulados),
];
