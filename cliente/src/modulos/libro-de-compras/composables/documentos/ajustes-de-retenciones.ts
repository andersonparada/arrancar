import type { AjusteSolicitado } from '../../servicios/registro-de-documentos.api';
import type { RetencionDeDocumento } from '../../servicios/documentos.api';
import { montoEnTexto } from './lineas-del-documento';

/** Lo que el usuario escribe al cambiar una retención propuesta. */
export interface AjusteEnEdicion {
  monto: string | number | null;
  motivo: string;
}

/** Los ajustes por regla de retención. */
export type AjustesEnEdicion = Record<string, AjusteEnEdicion>;

const aCentavos = (monto: string): number => Math.round(Number(monto) * 100);

/** El monto escrito difiere del propuesto: solo entonces es un ajuste (y pide motivo). */
export function cambiaLoPropuesto(ajuste: AjusteEnEdicion, retencion: RetencionDeDocumento): boolean {
  const monto = montoEnTexto(ajuste.monto);
  return monto !== null && aCentavos(monto) !== aCentavos(retencion.montoPropuesto);
}

/** Falta el motivo de un ajuste que sí cambia el monto. */
export const faltaElMotivo = (ajuste: AjusteEnEdicion, retencion: RetencionDeDocumento): boolean =>
  cambiaLoPropuesto(ajuste, retencion) && ajuste.motivo.trim() === '';

/** Un monto fuera de lo permitido: menor que cero o mayor que la base de la retención. */
export function montoFueraDeRango(ajuste: AjusteEnEdicion, retencion: RetencionDeDocumento): boolean {
  const monto = montoEnTexto(ajuste.monto);
  return monto !== null && (aCentavos(monto) < 0 || aCentavos(monto) > aCentavos(retencion.base));
}

/** Hay un ajuste al que le falta el motivo o con el monto fuera de rango: no se puede registrar así. */
export function ajustesIncompletos(ajustes: AjustesEnEdicion, retenciones: RetencionDeDocumento[]): boolean {
  return retenciones.some((retencion) => {
    const ajuste = ajustes[retencion.regla];
    return !!ajuste && (faltaElMotivo(ajuste, retencion) || montoFueraDeRango(ajuste, retencion));
  });
}

/**
 * Los ajustes para el cuerpo. Con `soloCompletos` (la vista previa) se dejan fuera los que aún no tienen motivo, para
 * no mostrar un error mientras el usuario todavía está escribiendo. Un ajuste que quedó igual a lo propuesto no se manda.
 */
export function ajustesParaElCuerpo(
  ajustes: AjustesEnEdicion,
  retenciones: RetencionDeDocumento[],
  soloCompletos: boolean,
): AjusteSolicitado[] {
  return retenciones.flatMap((retencion) => {
    const ajuste = ajustes[retencion.regla];
    const monto = ajuste ? montoEnTexto(ajuste.monto) : null;
    if (!ajuste || monto === null || !cambiaLoPropuesto(ajuste, retencion)) return [];
    if (soloCompletos && faltaElMotivo(ajuste, retencion)) return [];
    return [{ regla: retencion.regla, monto, motivo: ajuste.motivo.trim() || null }];
  });
}

/** Quita los ajustes de retenciones que el nuevo cálculo ya no propone (el servidor los rechazaría). */
export function ajustesVigentes(ajustes: AjustesEnEdicion, retenciones: RetencionDeDocumento[]): AjustesEnEdicion {
  const reglas = new Set(retenciones.map(({ regla }) => regla));
  return Object.fromEntries(Object.entries(ajustes).filter(([regla]) => reglas.has(regla)));
}
