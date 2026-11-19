import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type {
  AnulacionDeAperturaSolicitada,
  AperturaSolicitada,
  AumentoSolicitado,
  CustodioSolicitado,
  DisminucionSolicitada,
  EntregaSolicitada,
  FormaDeEntrega,
} from '../../servicios/tipos-de-fondos';

type Campo = string | number | null;

/** Cómo sale el dinero del banco (apertura y aumento): la chequera o la cuenta, el monto y la fecha. */
export interface EdicionDeEntrega {
  forma: FormaDeEntrega;
  /** La chequera (cheque) o la cuenta bancaria (nota de débito). */
  medioId: string | null;
  monto: Campo;
  /** Vacía: la decide el servidor (hoy, en la zona de la empresa). */
  fecha: string;
  referencia: string;
  beneficiario: string;
  noNegociable: boolean;
  observaciones: string;
}

export interface EdicionDeApertura extends EdicionDeEntrega {
  nombre: string;
  localidadId: string | null;
  custodio: string;
  custodioUsuarioId: string | null;
  tope: Campo;
}

export interface EdicionDeCustodio {
  custodio: string;
  custodioUsuarioId: string | null;
  fecha: string;
  motivo: string;
}

export interface EdicionDeDisminucion {
  monto: Campo;
  fecha: string;
  cuentaBancariaId: string | null;
  referencia: string;
  observaciones: string;
}

export const edicionDeEntrega = (): EdicionDeEntrega => ({
  forma: 'cheque',
  medioId: null,
  monto: '',
  fecha: '',
  referencia: '',
  beneficiario: '',
  noNegociable: true,
  observaciones: '',
});

export const edicionDeApertura = (): EdicionDeApertura => ({
  ...edicionDeEntrega(),
  nombre: '',
  localidadId: null,
  custodio: '',
  custodioUsuarioId: null,
  tope: '',
});

export const edicionDeCustodio = (): EdicionDeCustodio => ({
  custodio: '',
  custodioUsuarioId: null,
  fecha: '',
  motivo: '',
});

export const edicionDeDisminucion = (cuentaDelFondo: string | null): EdicionDeDisminucion => ({
  monto: '',
  fecha: '',
  cuentaBancariaId: cuentaDelFondo,
  referencia: '',
  observaciones: '',
});

/** El monto escrito sin espacios; un campo numérico entrega un número. */
export const montoEscrito = (valor: Campo): string => textoDeEdicion(valor).trim();

/**
 * La parte común del cuerpo de apertura y aumento. El beneficiario del cheque es el escrito o, si se dejó vacío, el
 * `porOmision` (el custodio): el servidor rechaza un cheque sin beneficiario.
 */
export function cuerpoDeEntrega(edicion: EdicionDeEntrega, porOmision = ''): EntregaSolicitada & { monto: string } {
  const comunes = { monto: montoEscrito(edicion.monto) };
  if (edicion.forma === 'cheque') {
    return {
      ...comunes,
      forma: 'cheque',
      chequeraId: edicion.medioId ?? '',
      beneficiario: textoONulo(edicion.beneficiario) ?? textoONulo(porOmision),
      noNegociable: edicion.noNegociable,
    };
  }
  return {
    ...comunes,
    forma: 'nota_de_debito',
    cuentaBancariaId: edicion.medioId ?? '',
    referencia: textoONulo(edicion.referencia),
  };
}

const conFecha = (fecha: string) => (fecha.trim() ? { fecha: fecha.trim() } : {});

export function cuerpoDeApertura(edicion: EdicionDeApertura): AperturaSolicitada {
  return {
    ...cuerpoDeEntrega(edicion, edicion.custodio),
    ...conFecha(edicion.fecha),
    observaciones: textoONulo(edicion.observaciones),
    nombre: edicion.nombre.trim(),
    localidadId: edicion.localidadId,
    custodio: textoONulo(edicion.custodio),
    custodioUsuarioId: edicion.custodioUsuarioId,
    topePorComprobante: textoONulo(edicion.tope),
  };
}

/** Aumentar: el cheque sale a nombre del custodio vigente del fondo si no se escribe otro beneficiario. */
export function cuerpoDeAumento(edicion: EdicionDeEntrega, custodio: string | null): AumentoSolicitado {
  return {
    ...cuerpoDeEntrega(edicion, custodio ?? ''),
    ...conFecha(edicion.fecha),
    observaciones: textoONulo(edicion.observaciones),
  };
}

export function cuerpoDeDisminucion(edicion: EdicionDeDisminucion): DisminucionSolicitada {
  return {
    monto: montoEscrito(edicion.monto),
    ...conFecha(edicion.fecha),
    cuentaBancariaId: edicion.cuentaBancariaId,
    referencia: textoONulo(edicion.referencia),
    observaciones: textoONulo(edicion.observaciones),
  };
}

/** El custodio nuevo: un usuario del sistema o solo un nombre; el servidor revisa que haya uno de los dos. */
export function cuerpoDeCustodio(edicion: EdicionDeCustodio): CustodioSolicitado {
  return {
    custodio: textoONulo(edicion.custodio),
    custodioUsuarioId: edicion.custodioUsuarioId,
    ...conFecha(edicion.fecha),
    motivo: edicion.motivo.trim(),
  };
}

export function cuerpoDeAnulacionDeApertura(motivo: string, fecha: string): AnulacionDeAperturaSolicitada {
  return { motivo: motivo.trim(), ...conFecha(fecha) };
}
