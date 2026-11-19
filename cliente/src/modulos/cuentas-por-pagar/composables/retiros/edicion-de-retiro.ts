import { textoONulo } from '@/modulos/core/utilidades/edicion';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { FormaDeRetiro, SolicitudDeRetiro } from '../../servicios/tipos-de-retiros';
import { centavosDe, textoDeCentavos } from '../dinero';

export const MAXIMO_DEL_CUSTODIO = 150;
export const MAXIMO_DE_OBSERVACIONES = 500;
export const MAXIMO_DE_REFERENCIA_DEL_RETIRO = 100;

/** Lo que se ve y se escribe al registrar un retiro. `medio` es la chequera (cheque) o la cuenta (retiro con nota de débito). */
export interface EdicionDeRetiro {
  forma: FormaDeRetiro;
  fecha: string;
  monto: string;
  /** El nombre escrito del custodio; si se escoge un usuario, el servidor usa el nombre de ese usuario. */
  custodio: string;
  custodioUsuarioId: string;
  medio: string;
  beneficiario: string;
  noNegociable: boolean;
  paraAbonoEnCuenta: boolean;
  referencia: string;
  observaciones: string;
}

export const edicionDeRetiroVacia = (hoy: string): EdicionDeRetiro => ({
  forma: 'cheque',
  fecha: hoy,
  monto: '',
  custodio: '',
  custodioUsuarioId: '',
  medio: '',
  beneficiario: '',
  noNegociable: true,
  paraAbonoEnCuenta: false,
  referencia: '',
  observaciones: '',
});

export const OPCIONES_DE_FORMA_DE_RETIRO: { valor: FormaDeRetiro; texto: string }[] = [
  { valor: 'cheque', texto: 'Cheque (se cambia en ventanilla)' },
  { valor: 'nota_de_debito', texto: 'Retiro en ventanilla o cajero (nota de débito)' },
];

/** Sin mayúsculas, tildes, espacios ni signos: «Al  Portador.» y «alportador» son lo mismo. */
const huella = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Un cheque sin beneficiario o «al portador» se cobraría sin identificarse; el servidor lo rechaza igual. */
export const esAlPortador = (texto: string): boolean => ['', 'alportador', 'portador'].includes(huella(texto));

/**
 * El beneficiario que se va a mandar: el escrito o, si se dejó en blanco, el custodio. Si el custodio es un usuario, su
 * nombre es `nombreDelUsuario` (el texto escrito del custodio no cuenta); si no se conoce, el servidor lo resuelve.
 */
export const beneficiarioEfectivo = (
  edicion: Pick<EdicionDeRetiro, 'beneficiario' | 'custodio'> & { custodioUsuarioId?: string },
  nombreDelUsuario = '',
): string => {
  const custodio = edicion.custodioUsuarioId ? nombreDelUsuario.trim() || 'usuario' : edicion.custodio.trim();
  return edicion.beneficiario.trim() || custodio;
};

function erroresDelCustodio(edicion: EdicionDeRetiro): Record<string, string> {
  if (!edicion.custodioUsuarioId && !edicion.custodio.trim()) {
    return { custodio: 'Escriba quién lleva el efectivo o escoja un usuario de Arrancar.' };
  }
  if (edicion.custodio.trim().length > MAXIMO_DEL_CUSTODIO) {
    return { custodio: `Acórtelo a ${MAXIMO_DEL_CUSTODIO} letras o menos.` };
  }
  return {};
}

function erroresDelMonto(edicion: EdicionDeRetiro): Record<string, string> {
  const centavos = centavosDe(edicion.monto);
  if (centavos === null) return { monto: 'Escriba el monto con hasta dos decimales, por ejemplo 5000.00.' };
  return centavos > 0 ? {} : { monto: 'Escriba el monto del retiro: debe ser mayor que cero.' };
}

function erroresDelMedio(edicion: EdicionDeRetiro, nombreDelUsuario: string): Record<string, string> {
  if (!edicion.medio) {
    return {
      medio:
        edicion.forma === 'cheque' ? 'Escoja la chequera del cheque.' : 'Escoja la cuenta bancaria de donde se retira.',
    };
  }
  if (edicion.forma === 'cheque' && esAlPortador(beneficiarioEfectivo(edicion, nombreDelUsuario))) {
    return {
      beneficiario: 'Escriba a nombre de quién va el cheque (el custodio o la empresa); no se emite al portador.',
    };
  }
  return {};
}

/** Los errores por campo antes de molestar al servidor; vacío si todo está bien. `hoy` es `AAAA-MM-DD`. */
export function erroresDelRetiro(edicion: EdicionDeRetiro, hoy: string, nombreDelUsuario = ''): Record<string, string> {
  const errores = {
    ...erroresDelCustodio(edicion),
    ...erroresDelMonto(edicion),
    ...erroresDelMedio(edicion, nombreDelUsuario),
  };
  if (!edicion.fecha) errores.fecha = 'Escriba la fecha del retiro.';
  else if (edicion.fecha > hoy)
    errores.fecha = 'El retiro no puede tener fecha futura: el efectivo no se retira por adelantado.';
  return errores;
}

/** El cuerpo que recibe el servidor; el custodio escrito no se manda si se escogió un usuario. */
export function solicitudDeRetiro(edicion: EdicionDeRetiro): SolicitudDeRetiro {
  const base = {
    fecha: edicion.fecha,
    monto: textoDeCentavos(centavosDe(edicion.monto) ?? 0),
    custodio: edicion.custodioUsuarioId ? null : textoONulo(edicion.custodio),
    custodioUsuarioId: edicion.custodioUsuarioId || null,
    observaciones: textoONulo(edicion.observaciones),
  };
  if (edicion.forma === 'cheque') {
    return {
      ...base,
      forma: 'cheque',
      chequeraId: edicion.medio,
      noNegociable: edicion.noNegociable,
      paraAbonoEnCuenta: edicion.paraAbonoEnCuenta,
      beneficiario: textoONulo(edicion.beneficiario),
    };
  }
  return {
    ...base,
    forma: 'nota_de_debito',
    cuentaBancariaId: edicion.medio,
    referencia: textoONulo(edicion.referencia),
  };
}

/** Las condiciones del cheque dichas en la confirmación: « no negociable», « para abono en cuenta», las dos o ninguna. */
export function condicionesDelCheque({
  noNegociable,
  paraAbonoEnCuenta,
}: Pick<EdicionDeRetiro, 'noNegociable' | 'paraAbonoEnCuenta'>): string {
  const condiciones = [noNegociable && 'no negociable', paraAbonoEnCuenta && 'para abono en cuenta'];
  const dichas = condiciones.filter(Boolean).join(' y ');
  return dichas ? ` ${dichas}` : '';
}

/** Qué va a pasar al registrar el retiro, para confirmarlo. */
export function resumenDelRetiro(edicion: EdicionDeRetiro, nombreDelCustodio: string, medio: string): string {
  const monto = formatearMonto(textoDeCentavos(centavosDe(edicion.monto) ?? 0));
  const documento =
    edicion.forma === 'cheque'
      ? `Bancos emitirá un cheque${condicionesDelCheque(edicion)} de ${medio}`
      : `Bancos registrará una nota de débito en ${medio}`;
  return (
    `Se retirarán ${monto} del banco para pagar a proveedores en efectivo, a cargo de ${nombreDelCustodio}. ` +
    `${documento} por ese monto. ` +
    'Después reparta el efectivo entre los proveedores; lo que sobre se devuelve al liquidar el retiro.'
  );
}
