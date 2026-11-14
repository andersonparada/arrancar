import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { CausaDeAjuste, DatosDeAjuste, FichaDelDocumento } from '../servicios/tipos';
import { CAUSAS_DE_AJUSTE } from '../textos';
import { centavosDe } from './dinero';
import { errorDelMotivo } from './reglas-de-acciones';

export const MAXIMO_DE_LA_REFERENCIA_DEL_AJUSTE = 100;

/** Lo que se escribe en la ventana de ajustar; la causa vacía es «todavía no escogió». */
export interface EdicionDeAjuste {
  abierta: boolean;
  monto: string;
  fecha: string;
  causa: CausaDeAjuste | '';
  referencia: string;
  motivo: string;
}

export const edicionDeAjusteVacia = (): EdicionDeAjuste => ({
  abierta: false,
  monto: '',
  fecha: '',
  causa: '',
  referencia: '',
  motivo: '',
});

/** Al abrir: se propone todo el saldo libre y la fecha de hoy. */
export const edicionDeAjuste = (saldoLibre: string, hoy: string): EdicionDeAjuste => ({
  ...edicionDeAjusteVacia(),
  abierta: true,
  monto: saldoLibre,
  fecha: hoy,
});

/** Las causas por nombre, con la invitación a escoger primero. */
export function opcionesDeCausaDeAjuste(): { valor: CausaDeAjuste | ''; texto: string }[] {
  const causas = (Object.entries(CAUSAS_DE_AJUSTE) as [CausaDeAjuste, string][])
    .map(([valor, texto]) => ({ valor, texto }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }));
  return [{ valor: '', texto: 'Escoja la causa' }, ...causas];
}

/** La fecha cae en un año anterior al de hoy: puede afectar estados financieros ya cerrados (solo avisa). */
export const esDeAnioAnterior = (fecha: string, hoy: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(fecha) && Number(fecha.slice(0, 4)) < Number(hoy.slice(0, 4));

/** «Diferencia menor» no se ofrece con tope cero; el tope viene de la ficha. */
export const topeDeDiferenciaMenor = (ficha: Pick<FichaDelDocumento, 'topeDiferenciaMenor'>): number =>
  centavosDe(ficha.topeDiferenciaMenor) ?? 0;

/** La ayuda de la causa escogida; en «Diferencia menor» dice el tope de la empresa. */
export function ayudaDeLaCausa(causa: CausaDeAjuste | '', tope: string, ayudas: Record<CausaDeAjuste, string>): string {
  if (!causa) return '';
  return causa === 'diferencia_menor' ? `${ayudas[causa]} Hasta ${formatearMonto(tope)}.` : ayudas[causa];
}

function errorDelMonto(monto: string, saldoLibre: string): string | null {
  const centavos = centavosDe(monto);
  if (centavos === null || centavos <= 0) return 'Escriba un monto mayor que cero, con hasta dos decimales.';
  return centavos > (centavosDe(saldoLibre) ?? 0)
    ? `Solo hay ${formatearMonto(saldoLibre)} a favor en la nota; baje el monto.`
    : null;
}

function errorDeLaFecha(fecha: string, minima: string | null, hoy: string): string | null {
  if (!fecha) return 'Escriba la fecha del ajuste.';
  if (fecha > hoy) return 'La fecha no puede ser futura.';
  return minima && fecha < minima
    ? `No puede ser anterior al ${formatearFecha(minima)}, cuando se recibió la nota.`
    : null;
}

function errorDeLaCausa({ causa, monto, referencia }: EdicionDeAjuste, tope: string): string | null {
  const centavos = centavosDe(monto) ?? 0;
  if (causa === 'diferencia_menor' && centavos > (centavosDe(tope) ?? 0))
    return `Como «Diferencia menor» solo se puede ajustar hasta ${formatearMonto(tope)}. Use «No se recuperará» si no se va a cobrar.`;
  if (causa === 'compensado_con_otra_cuenta' && !referencia.trim())
    return 'Escriba con qué se compensó (factura de venta, recibo o acuerdo).';
  return null;
}

/** Errores por campo antes de molestar al servidor; vacío si todo está bien. */
export function erroresDeAjuste(
  edicion: EdicionDeAjuste,
  ficha: FichaDelDocumento,
  hoy: string,
): Record<string, string> {
  const posibles: Record<string, string | null> = {
    monto: errorDelMonto(edicion.monto, ficha.saldo),
    fecha: errorDeLaFecha(edicion.fecha, ficha.fechaMinimaDeAjuste, hoy),
    causa: edicion.causa ? null : 'Escoja por qué se da de baja el saldo.',
    motivo: errorDelMotivo(edicion.motivo),
    referencia:
      edicion.referencia.trim().length > MAXIMO_DE_LA_REFERENCIA_DEL_AJUSTE
        ? `Acórtela a ${MAXIMO_DE_LA_REFERENCIA_DEL_AJUSTE} caracteres o menos.`
        : null,
  };
  const errorDeCausa = edicion.causa ? errorDeLaCausa(edicion, ficha.topeDiferenciaMenor) : null;
  if (errorDeCausa) posibles[edicion.causa === 'diferencia_menor' ? 'monto' : 'referencia'] ??= errorDeCausa;
  return Object.fromEntries(Object.entries(posibles).filter((par): par is [string, string] => par[1] !== null));
}

/** El cuerpo de la solicitud; solo se llama con la edición ya validada. */
export const datosDeAjuste = (edicion: EdicionDeAjuste): DatosDeAjuste => ({
  monto: edicion.monto.trim(),
  fecha: edicion.fecha,
  causa: edicion.causa as CausaDeAjuste,
  motivo: edicion.motivo.trim(),
  referencia: edicion.referencia.trim() || null,
});

/** Lo que va a pasar al confirmar. */
export function resumenDeAjuste(edicion: EdicionDeAjuste, ficha: FichaDelDocumento): string {
  const monto = formatearMonto(edicion.monto);
  const queda = (centavosDe(ficha.saldo) ?? 0) - (centavosDe(edicion.monto) ?? 0);
  const resto =
    queda > 0 ? `Quedarán ${formatearMonto((queda / 100).toFixed(2))} a favor.` : 'La nota quedará sin saldo a favor.';
  return `Se darán de baja ${monto} del saldo a favor de la nota. ${resto}`;
}
