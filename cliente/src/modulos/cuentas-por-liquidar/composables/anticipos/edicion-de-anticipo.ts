import { textoONulo } from '@/modulos/core/utilidades/edicion';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ClaseDeAnticipo, SolicitudDeEntrega } from '../../servicios/tipos-de-anticipos';
import { centavosDe, textoDeCentavos } from '../dinero';
import { sumarDias } from '../reportes/fechas-de-reportes';
import { NOMBRES_DE_CLASE } from './lista-de-anticipos';
import type { FormaDeMedio } from './opciones-de-medios';

export const MAXIMO_DE_LA_DESCRIPCION = 300;
export const MAXIMO_DE_REFERENCIA = 100;
export const MAXIMO_DEL_MOTIVO = 300;

/** Lo que se ve y se escribe al entregar un anticipo. `medio` es la chequera (cheque) o la cuenta (transferencia). */
export interface EdicionDeAnticipo {
  beneficiarioId: string;
  esEmpleado: boolean;
  /** El usuario de Arrancar que es el beneficiario, si lo es (vacío si no). */
  beneficiarioUsuarioId: string;
  clase: ClaseDeAnticipo;
  descripcion: string;
  monto: string;
  fecha: string;
  /** Vacío: la propone el servidor (la entrega más los días de la configuración). */
  fechaLimite: string;
  forma: FormaDeMedio;
  medio: string;
  noNegociable: boolean;
  referencia: string;
  motivoConVencidos: string;
}

export const edicionDeAnticipoVacia = (hoy: string): EdicionDeAnticipo => ({
  beneficiarioId: '',
  esEmpleado: true,
  beneficiarioUsuarioId: '',
  clase: 'viatico',
  descripcion: '',
  monto: '',
  fecha: hoy,
  fechaLimite: '',
  forma: 'cheque',
  medio: '',
  noNegociable: true,
  referencia: '',
  motivoConVencidos: '',
});

export const OPCIONES_DE_CLASE: { valor: ClaseDeAnticipo; texto: string }[] = [
  { valor: 'viatico', texto: 'Viático (viaje o gastos de campo)' },
  { valor: 'compra', texto: 'Compra (el beneficiario compra por la empresa)' },
  { valor: 'otro', texto: 'Otro' },
];

/** La fecha límite que se propondrá si no se escribe una: la entrega más los días de la configuración. */
export const fechaLimitePropuesta = (fecha: string, dias: number): string => (fecha ? sumarDias(fecha, dias) : '');

function erroresDelMonto(edicion: EdicionDeAnticipo): Record<string, string> {
  const centavos = centavosDe(edicion.monto);
  if (centavos === null) return { monto: 'Escriba el monto con hasta dos decimales, por ejemplo 1500.00.' };
  return centavos > 0 ? {} : { monto: 'Escriba el monto del anticipo: debe ser mayor que cero.' };
}

function erroresDeLasFechas(edicion: EdicionDeAnticipo, hoy: string): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.fecha) errores.fecha = 'Escriba la fecha de la entrega.';
  else if (edicion.fecha > hoy) errores.fecha = 'La entrega no puede tener fecha futura.';
  if (edicion.fechaLimite && edicion.fecha && edicion.fechaLimite < edicion.fecha) {
    errores.fechaLimite = 'La fecha límite no puede ser anterior a la entrega.';
  }
  return errores;
}

/** Los errores por campo antes de molestar al servidor; vacío si todo está bien. `hoy` es `AAAA-MM-DD`. */
export function erroresDelAnticipo(edicion: EdicionDeAnticipo, hoy: string): Record<string, string> {
  const errores: Record<string, string> = { ...erroresDelMonto(edicion), ...erroresDeLasFechas(edicion, hoy) };
  if (!edicion.beneficiarioId) errores.beneficiarioId = 'Escoja quién recibe el anticipo.';
  if (!edicion.descripcion.trim()) errores.descripcion = 'Escriba para qué es el anticipo.';
  else if (edicion.descripcion.trim().length > MAXIMO_DE_LA_DESCRIPCION) {
    errores.descripcion = `Acórtela a ${MAXIMO_DE_LA_DESCRIPCION} letras o menos.`;
  }
  if (!edicion.medio) {
    errores.medio = edicion.forma === 'cheque' ? 'Escoja la chequera del cheque.' : 'Escoja la cuenta bancaria.';
  }
  return errores;
}

/** El cuerpo que recibe el servidor: lo no escrito va como ausente o nulo. */
export function solicitudDeEntrega(edicion: EdicionDeAnticipo): SolicitudDeEntrega {
  const base = {
    beneficiarioId: edicion.beneficiarioId,
    esEmpleado: edicion.esEmpleado,
    beneficiarioUsuarioId: edicion.beneficiarioUsuarioId || null,
    clase: edicion.clase,
    descripcion: edicion.descripcion.trim(),
    monto: textoDeCentavos(centavosDe(edicion.monto) ?? 0),
    fecha: edicion.fecha,
    ...(edicion.fechaLimite ? { fechaLimite: edicion.fechaLimite } : {}),
    motivoConVencidos: textoONulo(edicion.motivoConVencidos),
  };
  if (edicion.forma === 'cheque') {
    return { ...base, forma: 'cheque', chequeraId: edicion.medio, noNegociable: edicion.noNegociable };
  }
  return {
    ...base,
    forma: 'nota_de_debito',
    cuentaBancariaId: edicion.medio,
    referencia: textoONulo(edicion.referencia),
  };
}

/** Qué va a pasar al entregar el anticipo, para confirmarlo. */
export function resumenDeLaEntrega(
  edicion: EdicionDeAnticipo,
  datos: { beneficiario: string; medio: string; fechaLimite: string },
): string {
  const monto = formatearMonto(textoDeCentavos(centavosDe(edicion.monto) ?? 0));
  const documento =
    edicion.forma === 'cheque'
      ? `Bancos emitirá un cheque${edicion.noNegociable ? ' no negociable' : ''} de ${datos.medio} a nombre de ${datos.beneficiario}`
      : `Bancos registrará una nota de débito en ${datos.medio}`;
  return (
    `Se entregarán ${monto} a ${datos.beneficiario} (${NOMBRES_DE_CLASE[edicion.clase].toLowerCase()}). ${documento}. ` +
    `Debe justificarlo con documentos hasta el ${formatearFecha(datos.fechaLimite)}; lo que sobre lo devuelve al liquidar.`
  );
}
