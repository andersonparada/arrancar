import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { DocumentoPorAsignar, FiltroDeBandeja, GastoDeBandeja } from '../../servicios/tipos-de-gastos';
import { centavosDelServidor, textoDeCentavos } from '../dinero';

export const MAXIMO_POR_TANDA = 100;

/** Lo que el usuario escoge para acotar la bandeja; el texto vacío es «sin fecha». */
export interface FiltrosDeBandeja {
  desde: string;
  hasta: string;
  soloConRetencion: boolean;
}

export const filtrosInicialesDeBandeja = (): FiltrosDeBandeja => ({ desde: '', hasta: '', soloConRetencion: false });

export const cantidadDeFiltrosDeBandeja = (filtros: FiltrosDeBandeja): number =>
  (filtros.desde ? 1 : 0) + (filtros.hasta ? 1 : 0) + (filtros.soloConRetencion ? 1 : 0);

/** Lo que se manda al servidor: nada de lo que quedó en «sin elegir». */
export const consultaDeBandeja = (filtros: FiltrosDeBandeja): FiltroDeBandeja => ({
  desde: filtros.desde || undefined,
  hasta: filtros.hasta || undefined,
  conRetencion: filtros.soloConRetencion ? true : undefined,
});

/** Un documento con retención solo lo asigna quien tiene el permiso de excepción; el servidor lo dice en cada fila. */
export const sePuedeAsignar = (gasto: Pick<GastoDeBandeja, 'conRetencion' | 'puedeAsignarConRetencion'>): boolean =>
  !gasto.conRetencion || gasto.puedeAsignarConRetencion;

/** Por qué una fila no se puede marcar (con qué se arregla), o `null` si sí se puede. */
export function motivoDeNoAsignable(
  gasto: Pick<GastoDeBandeja, 'conRetencion' | 'puedeAsignarConRetencion'>,
): string | null {
  if (sePuedeAsignar(gasto)) return null;
  return 'Lleva retención: pídale a quien tenga el permiso de excepción que la asigne, con su motivo.';
}

/** Lo que cada documento suma al anticipo; una nota de crédito resta. */
const aporteEnCentavos = (gasto: Pick<GastoDeBandeja, 'monto' | 'resta'>): number =>
  (gasto.resta ? -1 : 1) * centavosDelServidor(gasto.monto);

/** Lo marcado, en el orden de la bandeja. */
export const gastosMarcados = (gastos: readonly GastoDeBandeja[], marcados: ReadonlySet<string>): GastoDeBandeja[] =>
  gastos.filter(({ id }) => marcados.has(id));

/** Cuánto sumarían al anticipo los documentos marcados. */
export const totalDeLoMarcado = (marcados: readonly GastoDeBandeja[]): string =>
  textoDeCentavos(marcados.reduce((suma, gasto) => suma + aporteEnCentavos(gasto), 0));

export const hayConRetencion = (marcados: readonly GastoDeBandeja[]): boolean =>
  marcados.some(({ conRetencion }) => conRetencion);

/** Lo que se ve de un documento de la bandeja. */
export function detallesDeLaFilaDeBandeja(gasto: GastoDeBandeja): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [];
  if (gasto.proveedor) detalles.push({ etiqueta: 'Proveedor', valor: gasto.proveedor });
  detalles.push({ etiqueta: 'Fecha', valor: formatearFecha(gasto.fechaDeEmision ?? gasto.fecha) });
  detalles.push({ etiqueta: 'Sale del anticipo', valor: formatearMonto(gasto.monto) });
  if (gasto.montoRetenido !== '0.00') {
    detalles.push({ etiqueta: 'Retención (la entera la empresa)', valor: formatearMonto(gasto.montoRetenido) });
  }
  return detalles;
}

/** Lo que se escribe al asignar: a cuál anticipo, el motivo de la retención y la fecha si la del documento no sirve. */
export interface EdicionDeAsignacion {
  anticipoId: string;
  motivoConRetencion: string;
  fecha: string;
}

export const asignacionVacia = (anticipoId = ''): EdicionDeAsignacion => ({
  anticipoId,
  motivoConRetencion: '',
  fecha: '',
});

/** Los errores por campo antes de molestar al servidor. */
export function erroresDeLaAsignacion(
  edicion: EdicionDeAsignacion,
  marcados: readonly GastoDeBandeja[],
): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.anticipoId) errores.anticipoId = 'Escoja el anticipo al que van los documentos.';
  if (marcados.length === 0) errores.documentos = 'Marque al menos un documento.';
  else if (marcados.length > MAXIMO_POR_TANDA)
    errores.documentos = `Se asignan hasta ${MAXIMO_POR_TANDA} documentos a la vez.`;
  if (hayConRetencion(marcados) && !edicion.motivoConRetencion.trim()) {
    errores.motivoConRetencion =
      'Escriba por qué se paga del anticipo un documento con retención: queda en la auditoría.';
  }
  return errores;
}

/** El cuerpo que recibe el servidor: el motivo solo viaja en los documentos con retención. */
export function documentosPorAsignar(
  marcados: readonly GastoDeBandeja[],
  edicion: EdicionDeAsignacion,
): DocumentoPorAsignar[] {
  return marcados.map((gasto) => ({
    gastoId: gasto.id,
    ...(edicion.fecha ? { fecha: edicion.fecha } : {}),
    ...(gasto.conRetencion ? { motivoConRetencion: edicion.motivoConRetencion.trim() } : {}),
  }));
}

/** Qué va a pasar al asignar, para confirmarlo. */
export function resumenDeLaAsignacion(marcados: readonly GastoDeBandeja[], anticipo: string): string {
  const cantidad = marcados.length === 1 ? '1 documento' : `${marcados.length} documentos`;
  const conRetencion = marcados.filter(({ conRetencion: lleva }) => lleva).length;
  const excepcion =
    conRetencion > 0
      ? ` ${conRetencion === 1 ? 'Uno lleva' : `${conRetencion} llevan`} retención: la asigna como excepción, con su motivo, y queda en la auditoría.`
      : '';
  return `Se asignan ${cantidad} por ${formatearMonto(totalDeLoMarcado(marcados))} a ${anticipo}.${excepcion}`;
}
