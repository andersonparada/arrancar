import type { PeriodoAbiertoPropuesto } from './periodo-abierto-propuesto.js';

const mes = (periodo: string): string => periodo.slice(0, 7);

/** La última declaración de un período, como se cita en los avisos. */
export interface DeclaracionCitada {
  formulario: string;
  numeroDeFormulario: string | null;
  /** La fecha de presentación o, si no se anotó, la del día en que se declaró en Arrancar. */
  fecha: string;
}

export const AVISO_DE_ANULACION_DE_DTE =
  'Los emisores pueden anular un DTE hasta el vencimiento de la declaración: si un proveedor anula una factura de este período después de declararlo, tendrá que rectificar.';

/** Reemplaza al aviso genérico de «período pasado» cuando se sabe que el período sí se declaró. */
export function avisoDePeriodoDeclarado(periodo: string, declaracion: DeclaracionCitada): string {
  const numero = declaracion.numeroDeFormulario ? ` nº ${declaracion.numeroDeFormulario}` : '';
  return `El período ${mes(periodo)} se declaró el ${declaracion.fecha} (${declaracion.formulario}${numero}): tendrá que rectificar.`;
}

function consejoDeLaPropuesta(propuesta: PeriodoAbiertoPropuesto, periodo: string): string {
  if (propuesta.periodo === null) return `Reabra el período ${mes(periodo)} para registrarla y luego rectifique.`;
  if (propuesta.enPlazo) return `Puede registrarla en ${mes(propuesta.periodo)}, que sigue abierto.`;
  return `Registrarla en ${mes(propuesta.periodo)} pierde el crédito (art. 20): el IVA irá al costo. También puede reabrir ${mes(periodo)} y rectificar.`;
}

/** La vista previa no bloquea: avisa que registrar fallaría y qué se puede hacer. */
export function avisoDePeriodoBloqueado(periodo: string, propuesta: PeriodoAbiertoPropuesto): string {
  return `El período ${mes(periodo)} está declarado y no admite documentos. ${consejoDeLaPropuesta(propuesta, periodo)}`;
}

/** Se propuso otro período porque el que correspondía está declarado y bloqueado. */
export function avisoDePeriodoCambiado(periodo: string, propuesta: PeriodoAbiertoPropuesto): string {
  const nuevo = mes(propuesta.periodo ?? periodo);
  const base = `El período ${mes(periodo)} está declarado y no admite documentos: se propone ${nuevo}.`;
  return propuesta.enPlazo
    ? base
    : `${base} Ahí pierde el crédito (art. 20): el IVA irá al costo; también puede reabrir ${mes(periodo)} y rectificar.`;
}

/** Al declarar: quedan DTE por registrar que pueden ir en el período. */
export function avisoDeBandeja(pendientes: number): string {
  const [verbo, sustantivo] = pendientes === 1 ? ['Queda', 'DTE pendiente'] : ['Quedan', 'DTE pendientes'];
  return `${verbo} ${pendientes} ${sustantivo} en la bandeja que puede${pendientes === 1 ? '' : 'n'} ir en este período.`;
}
