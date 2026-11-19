import { textoONulo } from '@/modulos/core/utilidades/edicion';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { Retiro, SolicitudDeLiquidacion } from '../../servicios/tipos-de-retiros';
import { centavosDe, textoDeCentavos } from '../dinero';

export const MAXIMO_DEL_MOTIVO_DE_FALTANTE = 300;

export const AVISO_DEL_CUSTODIO = 'Usted es el custodio de este retiro: conviene que lo liquide otra persona.';

/** Lo que se ve y se escribe al liquidar: lo que se deposita de vuelta y lo que falta, que juntos son lo que sobró. */
export interface EdicionDeLiquidacion {
  abierta: boolean;
  /** Lo que no se pagó del retiro, en centavos: `devuelto + faltante` debe dar eso. */
  sobrante: number;
  devuelto: string;
  faltante: string;
  motivoDeFaltante: string;
  fecha: string;
  cuentaBancariaId: string;
  referencia: string;
  /** Quien liquida es el custodio (el servidor lo dice). */
  liquidaElCustodio: boolean;
  numero: string;
  custodio: string;
}

export const liquidacionCerrada = (): EdicionDeLiquidacion => ({
  abierta: false,
  sobrante: 0,
  devuelto: '',
  faltante: '0.00',
  motivoDeFaltante: '',
  fecha: '',
  cuentaBancariaId: '',
  referencia: '',
  liquidaElCustodio: false,
  numero: '',
  custodio: '',
});

/** Al abrir: se propone devolver todo lo que sobró; el usuario baja lo devuelto y el resto pasa a faltante. */
export function liquidacionDelRetiro(retiro: Retiro, hoy: string): EdicionDeLiquidacion {
  const sobrante = centavosDe(retiro.disponible) ?? 0;
  return {
    ...liquidacionCerrada(),
    abierta: true,
    sobrante,
    devuelto: textoDeCentavos(sobrante),
    fecha: hoy,
    cuentaBancariaId: retiro.movimiento.cuentaBancariaId,
    liquidaElCustodio: retiro.liquidaElCustodio,
    numero: retiro.numero,
    custodio: retiro.custodio,
  };
}

/** Lo que falta para completar el sobrante, en centavos (nunca negativo). */
const restante = (sobrante: number, escrito: string): number => Math.max(0, sobrante - (centavosDe(escrito) ?? 0));

/** Al escribir lo devuelto, el resto del sobrante pasa solo a «lo que falta». */
export function conDevuelto(edicion: EdicionDeLiquidacion, devuelto: string): EdicionDeLiquidacion {
  return { ...edicion, devuelto, faltante: textoDeCentavos(restante(edicion.sobrante, devuelto)) };
}

/** Al escribir lo que falta, el resto del sobrante pasa solo a «lo devuelto». */
export function conFaltante(edicion: EdicionDeLiquidacion, faltante: string): EdicionDeLiquidacion {
  return { ...edicion, faltante, devuelto: textoDeCentavos(restante(edicion.sobrante, faltante)) };
}

const centavosDeCampo = (texto: string): number | null => (texto.trim() === '' ? 0 : centavosDe(texto));

/** Lo devuelto y lo que falta: números válidos que sumen lo que sobró. */
function erroresDeLaSuma(edicion: EdicionDeLiquidacion): Record<string, string> {
  const devuelto = centavosDeCampo(edicion.devuelto);
  const faltante = centavosDeCampo(edicion.faltante);
  const errores: Record<string, string> = {};
  if (devuelto === null) errores.devuelto = 'Escriba lo devuelto con hasta dos decimales, por ejemplo 250.00.';
  if (faltante === null) errores.faltante = 'Escriba lo que falta con hasta dos decimales, por ejemplo 0.00.';
  if (devuelto !== null && faltante !== null && devuelto + faltante !== edicion.sobrante) {
    errores.devuelto = `Lo devuelto más lo que falta debe ser ${formatearMonto(textoDeCentavos(edicion.sobrante))} (lo que no se pagó).`;
  }
  return errores;
}

/** Lo devuelto y lo que falta, con el motivo si falta algo. */
function erroresDeLosMontos(edicion: EdicionDeLiquidacion): Record<string, string> {
  const errores = erroresDeLaSuma(edicion);
  if ((centavosDeCampo(edicion.faltante) ?? 0) > 0 && !edicion.motivoDeFaltante.trim()) {
    errores.motivoDeFaltante = 'Escriba por qué falta efectivo: queda en la auditoría.';
  }
  return errores;
}

/** Los errores por campo antes de molestar al servidor; `hoy` es `AAAA-MM-DD`. */
export function erroresDeLaLiquidacion(edicion: EdicionDeLiquidacion, hoy: string): Record<string, string> {
  const errores = erroresDeLosMontos(edicion);
  if (!edicion.fecha) errores.fecha = 'Escriba la fecha de la liquidación.';
  else if (edicion.fecha > hoy) errores.fecha = 'La liquidación no puede tener fecha futura.';
  if ((centavosDeCampo(edicion.devuelto) ?? 0) > 0 && !edicion.cuentaBancariaId) {
    errores.cuentaBancariaId = 'Escoja la cuenta donde se deposita.';
  }
  return errores;
}

/** El cuerpo que recibe el servidor; sin depósito no se manda cuenta ni boleta. */
export function solicitudDeLiquidacion(edicion: EdicionDeLiquidacion): SolicitudDeLiquidacion {
  const devuelto = centavosDeCampo(edicion.devuelto) ?? 0;
  const faltante = centavosDeCampo(edicion.faltante) ?? 0;
  return {
    fecha: edicion.fecha,
    devuelto: textoDeCentavos(devuelto),
    faltante: textoDeCentavos(faltante),
    motivoDeFaltante: faltante > 0 ? textoONulo(edicion.motivoDeFaltante) : null,
    ...(devuelto > 0 ? { cuentaBancariaId: edicion.cuentaBancariaId } : {}),
    referencia: devuelto > 0 ? textoONulo(edicion.referencia) : null,
  };
}

/** Qué va a pasar al liquidar, en una frase por efecto. */
export function resumenDeLaLiquidacion(edicion: EdicionDeLiquidacion, cuenta: string): string {
  const devuelto = centavosDeCampo(edicion.devuelto) ?? 0;
  const faltante = centavosDeCampo(edicion.faltante) ?? 0;
  const partes = [`Se cierra el retiro ${edicion.numero}: ya no se podrá pagar con él.`];
  if (devuelto > 0) {
    partes.push(`Bancos registrará un depósito de ${formatearMonto(textoDeCentavos(devuelto))} en ${cuenta}.`);
  }
  if (faltante > 0) {
    partes.push(
      `Quedarán ${formatearMonto(textoDeCentavos(faltante))} como faltante de efectivo a cargo de ${edicion.custodio}: ` +
        'queda en la auditoría y en el flujo de efectivo (operación); Contabilidad decide a qué cuenta se carga.',
    );
  }
  if (devuelto === 0 && faltante === 0) partes.push('Todo el efectivo se usó en pagos: no hay nada que devolver.');
  return partes.join(' ');
}
