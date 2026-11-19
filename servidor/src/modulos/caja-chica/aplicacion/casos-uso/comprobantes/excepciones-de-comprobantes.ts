import { etiquetaDelComprobante, type Comprobante } from '../../../dominio/comprobantes.js';
import {
  MotivoConRetencionObligatorio,
  MotivoConRetencionSinRetencion,
  MotivoSobreElTopeObligatorio,
} from '../../../dominio/errores-de-comprobantes.js';
import { ComprobanteSobreElTope, RetencionSinPermiso, ValeDeGastoSobreElTope } from '../../errores-de-comprobantes.js';

/**
 * Las excepciones que autoriza quien asigna (tope y retención, §5.4 g): piden el permiso de quien actúa y un motivo. Viven
 * en la capa de aplicación porque «sin permiso» es un acceso denegado (403).
 */

/** Si quien actúa tiene el permiso de la excepción y el motivo que escribió (el vacío cuenta como ninguno). */
export interface Excepcion {
  permitida: boolean;
  motivo: string | null | undefined;
}

const motivoEscrito = ({ motivo }: Excepcion): string | null => {
  const limpio = motivo?.trim();
  return limpio ? limpio : null;
};

type ParaElTope = Pick<Comprobante, 'montoCentavos' | 'documento' | 'numero' | 'clase'>;

/**
 * El tope (CC-i): sobre el tope hace falta el permiso de excepción y un motivo.
 * @returns el motivo que se guarda; `null` si no pasa del tope.
 * @throws ComprobanteSobreElTope, MotivoSobreElTopeObligatorio
 */
export function motivoDelTope(por: {
  comprobante: ParaElTope;
  tope: number | null;
  excepcion: Excepcion;
}): string | null {
  const { comprobante, tope, excepcion } = por;
  if (tope === null || comprobante.montoCentavos <= tope) return null;
  const etiqueta = etiquetaDelComprobante(comprobante);
  if (!excepcion.permitida) {
    throw new ComprobanteSobreElTope({ etiqueta, montoCentavos: comprobante.montoCentavos, topeCentavos: tope });
  }
  return motivoEscrito(excepcion) ?? fallar(new MotivoSobreElTopeObligatorio(etiqueta));
}

/**
 * El tope del vale de gasto: igual que el de un comprobante, con su propio error.
 * @throws ValeDeGastoSobreElTope, MotivoSobreElTopeObligatorio
 */
export function motivoDelTopeDelVale(por: {
  montoCentavos: number;
  tope: number | null;
  excepcion: Excepcion;
}): string | null {
  const { montoCentavos, tope, excepcion } = por;
  if (tope === null || montoCentavos <= tope) return null;
  if (!excepcion.permitida) throw new ValeDeGastoSobreElTope(tope);
  return motivoEscrito(excepcion) ?? fallar(new MotivoSobreElTopeObligatorio('del vale'));
}

/**
 * La excepción de retención (CC-f = A′): una factura con retención solo entra al fondo con el permiso de quien la asigna
 * y su motivo. Un motivo en una factura sin retención no se guarda.
 * @returns el motivo que se guarda; `null` si no lleva retención.
 * @throws RetencionSinPermiso, MotivoConRetencionObligatorio, MotivoConRetencionSinRetencion
 */
export function motivoDeLaRetencion(comprobante: Comprobante, excepcion: Excepcion): string | null {
  const etiqueta = etiquetaDelComprobante(comprobante);
  if (!comprobante.conRetencion) {
    if (motivoEscrito(excepcion) !== null) throw new MotivoConRetencionSinRetencion(etiqueta);
    return null;
  }
  if (!excepcion.permitida) {
    throw new RetencionSinPermiso({ etiqueta, retenidoCentavos: comprobante.montoRetenidoCentavos });
  }
  return motivoEscrito(excepcion) ?? fallar(new MotivoConRetencionObligatorio(etiqueta));
}

function fallar(error: Error): never {
  throw error;
}
