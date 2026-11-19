import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  AnticipoResumen,
  ClaseDeAnticipo,
  ConsultaDeAnticipos,
  EstadoBuscadoDeAnticipo,
  EstadoDeAnticipo,
  FormaDeAnticipo,
} from '../../servicios/tipos-de-anticipos';

export const ANTICIPOS_POR_PAGINA = 24;

/** Lo que el usuario escoge en la lista; el texto vacío es «sin elegir». */
export interface FiltrosDeAnticipos {
  estado: EstadoBuscadoDeAnticipo;
  /** Con fecha, la lista dice lo que estaba por justificar al cierre de ese día. */
  corte: string;
  beneficiarioId: string;
  soloVencidos: boolean;
}

/** Al abrir: lo abierto, que es lo que hay que perseguir. */
export const filtrosInicialesDeAnticipos = (): FiltrosDeAnticipos => ({
  estado: 'abierto',
  corte: '',
  beneficiarioId: '',
  soloVencidos: false,
});

export const OPCIONES_DE_ESTADO_DE_ANTICIPO: { valor: EstadoBuscadoDeAnticipo; texto: string }[] = [
  { valor: 'abierto', texto: 'Por liquidar' },
  { valor: 'liquidado', texto: 'Liquidados' },
  { valor: 'anulado', texto: 'Anulados' },
  { valor: 'todos', texto: 'Todos' },
];

const NOMBRES_DE_ESTADO: Record<EstadoDeAnticipo, string> = {
  abierto: 'Por liquidar',
  liquidado: 'Liquidado',
  anulado: 'Anulado',
};

export const nombreDelEstadoDeAnticipo = (estado: EstadoDeAnticipo): string => NOMBRES_DE_ESTADO[estado];

export const NOMBRES_DE_CLASE: Record<ClaseDeAnticipo, string> = {
  viatico: 'Viático',
  compra: 'Compra',
  otro: 'Otro',
};

const NOMBRES_DE_FORMA: Record<FormaDeAnticipo, string> = { cheque: 'Cheque', nota_de_debito: 'Nota de débito' };

/** «Cheque 1523» o «Nota de débito 45»: el documento que Bancos creó. */
export const documentoDelAnticipo = (forma: FormaDeAnticipo, numero: number): string =>
  `${NOMBRES_DE_FORMA[forma]} ${numero}`;

/** Lo que se manda al servidor: nada de lo que quedó en «sin elegir». */
export function consultaDeAnticipos(filtros: FiltrosDeAnticipos, pagina: number): ConsultaDeAnticipos {
  return {
    estado: filtros.estado,
    corte: filtros.corte || undefined,
    beneficiarioId: filtros.beneficiarioId || undefined,
    vencidos: filtros.soloVencidos ? true : undefined,
    pagina,
    limite: ANTICIPOS_POR_PAGINA,
  };
}

/** Cuántos filtros distintos de la forma de abrir hay. */
export function cantidadDeFiltrosDeAnticipos(filtros: FiltrosDeAnticipos): number {
  return (
    (filtros.estado === 'abierto' ? 0 : 1) +
    (filtros.corte ? 1 : 0) +
    (filtros.beneficiarioId ? 1 : 0) +
    (filtros.soloVencidos ? 1 : 0)
  );
}

/** «hoy», «hace 1 día» o «hace 12 días» desde la entrega. */
export function textoDeAntiguedad(dias: number): string {
  if (dias <= 0) return 'hoy';
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

/** El texto del por justificar: negativo es que se gastó de más y la empresa debe reembolsar. */
export function textoDePorJustificar(porJustificar: string): string {
  return porJustificar.startsWith('-')
    ? `Gastado de más: ${formatearMonto(porJustificar.slice(1))}`
    : formatearMonto(porJustificar);
}

/** Lo que se ve de un anticipo en su tarjeta; con corte, el por justificar es el de esa fecha. */
export function detallesDeLaFilaDeAnticipo(anticipo: AnticipoResumen, corte: string): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Beneficiario', valor: anticipo.beneficiario },
    { etiqueta: 'Clase', valor: NOMBRES_DE_CLASE[anticipo.clase] },
    { etiqueta: 'Documento', valor: documentoDelAnticipo(anticipo.forma, anticipo.documento) },
    {
      etiqueta: 'Entrega',
      valor: `${formatearFecha(anticipo.fecha)} (${textoDeAntiguedad(anticipo.diasDesdeLaEntrega)})`,
    },
    { etiqueta: 'Anticipo', valor: formatearMonto(anticipo.monto) },
  ];
  if (anticipo.estado === 'abierto') {
    detalles.push({
      etiqueta: corte ? `Por justificar al ${formatearFecha(corte)}` : 'Por justificar',
      valor: textoDePorJustificar(anticipo.porJustificar),
    });
    detalles.push({ etiqueta: 'Fecha límite', valor: formatearFecha(anticipo.fechaLimite) });
    if (anticipo.aviso) detalles.push({ etiqueta: 'Aviso', valor: anticipo.aviso, largo: true });
  }
  return detalles;
}

/** La marca de la tarjeta: lo cerrado se nombra; un abierto vencido avisa cuántos días lleva vencido. */
export function marcaDelAnticipo(
  anticipo: Pick<AnticipoResumen, 'estado' | 'vencido' | 'diasVencido'>,
): string | undefined {
  if (anticipo.estado !== 'abierto') return nombreDelEstadoDeAnticipo(anticipo.estado);
  if (!anticipo.vencido) return undefined;
  return `Vencido hace ${anticipo.diasVencido} ${anticipo.diasVencido === 1 ? 'día' : 'días'}`;
}

/** Cuántos de la página pasaron su fecha límite, dicho para leerlo arriba de la lista; `null` si ninguno. */
export function resumenDeVencidos(anticipos: readonly AnticipoResumen[]): string | null {
  const cantidad = anticipos.filter(({ vencido, estado }) => vencido && estado === 'abierto').length;
  if (cantidad === 0) return null;
  const texto = cantidad === 1 ? '1 anticipo pasó' : `${cantidad} anticipos pasaron`;
  return `${texto} de su fecha límite sin liquidarse. Cobre los documentos o liquídelos.`;
}
