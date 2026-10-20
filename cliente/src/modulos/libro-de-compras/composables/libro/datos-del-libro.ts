import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type {
  AnuladoDelLibro,
  ColumnaDeDinero,
  FilaDelLibro,
  ResumenDelLibro,
  TipoDeLibro,
} from '../../servicios/libro.api';
import { MOTIVOS_CORTOS, SIN_TIPO_DTE } from '../../textos-del-libro';
import { CAUSAS_DE_ANULACION } from '../../textos-de-documentos';
import { TIPOS_SAT } from '../documentos/tipos-de-documento-sat';
import { etiquetaDePeriodo, mesDe } from '../documentos/filtros-de-documentos';

/** Una columna de la tabla; `dinero` es verdadero si es un monto (a la derecha y con total al pie). */
export interface ColumnaDelLibro {
  clave: string;
  titulo: string;
  dinero: boolean;
}

const texto = (clave: string, titulo: string): ColumnaDelLibro => ({ clave, titulo, dinero: false });
const dinero = (clave: ColumnaDeDinero, titulo: string): ColumnaDelLibro => ({ clave, titulo, dinero: true });

const INICIO: ColumnaDelLibro[] = [
  texto('numeroDeFila', 'N.º'),
  texto('fecha', 'Fecha'),
  texto('tipoDte', 'Tipo'),
  texto('documento', 'Documento'),
  texto('nit', 'NIT'),
  texto('nombre', 'Proveedor'),
];

const COLUMNAS_COMPLETO: ColumnaDelLibro[] = [
  ...INICIO,
  texto('siglaDelMotivo', 'Motivo'),
  dinero('bienes', 'Bienes'),
  dinero('servicios', 'Servicios'),
  dinero('combustibles', 'Combustibles'),
  dinero('pequenoContribuyente', 'Pequeño contribuyente'),
  dinero('primarioPecuario', 'Primario o pecuario'),
  dinero('exentoYNoAfecto', 'Exento y no afecto'),
  dinero('idp', 'IDP'),
  dinero('ivaConCredito', 'IVA con crédito'),
  dinero('ivaSinCredito', 'IVA sin crédito'),
  dinero('total', 'Total'),
];

const COLUMNAS_SIMPLIFICADO: ColumnaDelLibro[] = [
  ...INICIO,
  dinero('bienes', 'Bienes'),
  dinero('servicios', 'Servicios'),
  dinero('exentoYNoAfecto', 'Exento y no afecto'),
  dinero('idp', 'IDP'),
  dinero('ivaInformativo', 'IVA (informativo)'),
  dinero('total', 'Total'),
];

/** Las columnas que lleva cada tipo de libro. */
export const columnasDelLibro = (tipo: TipoDeLibro): ColumnaDelLibro[] =>
  tipo === 'completo' ? COLUMNAS_COMPLETO : COLUMNAS_SIMPLIFICADO;

/** Un monto con signo del servidor es negativo si empieza con «-» y no es cero. */
export const esNegativo = (monto: string): boolean => monto.startsWith('-') && !/^-0(\.0+)?$/.test(monto);

/** «A-123» o «123» cuando no hay serie. */
export const numeroDeDocumento = (fila: { serie: string | null; numero: string }): string =>
  fila.serie ? `${fila.serie}-${fila.numero}` : fila.numero;

/** El nombre del código de la SAT («Factura»); si no se conoce, el código tal cual. */
export function nombreDelTipoDte(codigo: string | null): string {
  if (!codigo) return SIN_TIPO_DTE;
  return TIPOS_SAT.find((tipo) => tipo.codigo === codigo)?.nombre ?? codigo;
}

/** Una fila es de nota de crédito (o de cualquier documento que resta) si su total es negativo. */
export const filaEsNegativa = (fila: FilaDelLibro): boolean => esNegativo(fila.total);

/** El mes anterior al de `hoy`, como `AAAA-MM`: el libro que se está por declarar. */
export const periodoAnterior = (hoy: Date): string => mesDe(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));

const MESES_QUE_SE_OFRECEN = 36;
const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** Los últimos 36 meses (del actual hacia atrás); si `actual` es más antiguo, se agrega para que tenga etiqueta. */
export function opcionesDePeriodoDelLibro(hoy: Date, actual: string): OpcionBuscable<string>[] {
  const meses = Array.from({ length: MESES_QUE_SE_OFRECEN }, (_, atras) =>
    mesDe(new Date(hoy.getFullYear(), hoy.getMonth() - atras, 1)),
  );
  const todos = meses.includes(actual) ? meses : [...meses, actual];
  return todos.map((mes) => ({ valor: mes, texto: conMayuscula(etiquetaDePeriodo(mes)) }));
}

/** Un monto de una tarjeta del resumen. */
export interface LineaDeResumen {
  clave: string;
  texto: string;
  monto: string;
}

/** El IVA sin crédito por motivo, en orden de nombre. */
export function ivaSinCreditoPorMotivo(resumen: ResumenDelLibro): LineaDeResumen[] {
  return resumen.ivaSinCreditoPorMotivo
    .map((grupo) => ({ clave: grupo.motivo, texto: MOTIVOS_CORTOS[grupo.motivo], monto: grupo.ivaSinCredito }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }));
}

/** Los documentos por tipo de DTE, en orden de nombre. */
export function documentosPorTipo(resumen: ResumenDelLibro): Array<LineaDeResumen & { cantidad: number }> {
  return resumen.porTipoDte
    .map((grupo) => ({
      clave: grupo.tipoDte ?? 'sin-tipo',
      texto: nombreDelTipoDte(grupo.tipoDte),
      monto: grupo.total,
      cantidad: grupo.cantidad,
    }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }));
}

/** Combustibles del período; se muestran solo si hubo alguno. */
export function lineasDeCombustibles(combustibles: ResumenDelLibro['combustibles']): LineaDeResumen[] {
  const lineas: LineaDeResumen[] = [
    { clave: 'base', texto: 'Base', monto: combustibles.base },
    { clave: 'idp', texto: 'IDP', monto: combustibles.idp },
    { clave: 'iva', texto: 'IVA', monto: combustibles.iva },
    { clave: 'exento', texto: 'Exento por decreto', monto: combustibles.exentoPorDecreto },
  ];
  return lineas.some((linea) => !/^-?0(\.0+)?$/.test(linea.monto)) ? lineas : [];
}

/** La causa de anulación en palabras; si es desconocida, tal cual. */
export const textoDeCausaDeAnulacion = (causa: string | null): string =>
  causa ? ((CAUSAS_DE_ANULACION as Record<string, string>)[causa] ?? causa) : '';

export const resumenDeAnulados = (anulados: AnuladoDelLibro[]): string =>
  anulados.length === 1 ? '1 documento anulado' : `${anulados.length} documentos anulados`;
