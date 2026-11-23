import { esDpiValido, normalizarDpi } from '../../core/compartido/dominio/objetos-valor/dpi.js';
import { esNitValido, normalizarNit } from '../../core/compartido/dominio/objetos-valor/nit.js';
import { ClienteObligatorio, ReceptorInvalido } from './errores-de-documento.js';

export const TIPOS_DE_IDENTIFICACION = ['nit', 'cui', 'extranjero', 'cf'] as const;
export type TipoDeIdentificacion = (typeof TIPOS_DE_IDENTIFICACION)[number];

const CONSUMIDOR_FINAL = 'CF';
const MAXIMO_DE_IDENTIFICACION = 20;
const MAXIMO_DEL_NOMBRE = 200;

/** Lo que se sabe del cliente escogido, para completar lo que el usuario no escribió. */
export interface ClienteDelDocumento {
  nit: string | null;
  dpi: string | null;
  nombre: string;
}

/** Lo que el cuerpo dice de a quién se le vendió. */
export interface ReceptorSolicitado {
  tipoDeIdentificacion?: TipoDeIdentificacion | null;
  nitReceptor?: string | null;
  nombreReceptor?: string | null;
}

/** Cómo quedó el receptor del documento: identificación y nombre tal como van en el DTE. */
export interface Receptor {
  tipoDeIdentificacion: TipoDeIdentificacion;
  nitReceptor: string;
  nombreReceptor: string;
}

const texto = (valor: string | null | undefined): string => valor?.trim() ?? '';

function nombreDelReceptor(solicitado: ReceptorSolicitado, cliente: ClienteDelDocumento | null): string {
  const nombre = texto(solicitado.nombreReceptor) || cliente?.nombre.trim() || 'Consumidor final';
  if (nombre.length > MAXIMO_DEL_NOMBRE) throw new ReceptorInvalido('El nombre del receptor pasa de 200 caracteres.');
  return nombre;
}

/** Sin cliente solo cabe el consumidor final. */
function consumidorFinal(solicitado: ReceptorSolicitado): Receptor {
  const tipo = solicitado.tipoDeIdentificacion ?? 'cf';
  const nit = texto(solicitado.nitReceptor).toUpperCase() || CONSUMIDOR_FINAL;
  if (tipo !== 'cf' || nit !== CONSUMIDOR_FINAL) throw new ClienteObligatorio();
  return {
    tipoDeIdentificacion: 'cf',
    nitReceptor: CONSUMIDOR_FINAL,
    nombreReceptor: nombreDelReceptor(solicitado, null),
  };
}

/** Qué identificación y de qué clase lleva el documento de un cliente que no la dijo el usuario. */
function identificacionDelCliente(cliente: ClienteDelDocumento): { tipo: TipoDeIdentificacion; valor: string } {
  if (cliente.nit) return { tipo: 'nit', valor: cliente.nit };
  if (cliente.dpi) return { tipo: 'cui', valor: cliente.dpi };
  return { tipo: 'cf', valor: CONSUMIDOR_FINAL };
}

type Validador = (escrito: string) => string;

function validarConsumidorFinal(escrito: string): string {
  if (escrito.toUpperCase() !== CONSUMIDOR_FINAL)
    throw new ReceptorInvalido('Consumidor final se identifica con «CF».');
  return CONSUMIDOR_FINAL;
}

function validarNit(escrito: string): string {
  const nit = normalizarNit(escrito);
  if (nit === CONSUMIDOR_FINAL || !esNitValido(nit)) throw new ReceptorInvalido('El NIT del receptor no es válido.');
  return nit;
}

function validarCui(escrito: string): string {
  const dpi = normalizarDpi(escrito);
  if (!esDpiValido(dpi)) throw new ReceptorInvalido('El CUI del receptor no es válido (13 dígitos).');
  return dpi;
}

function validarExtranjero(escrito: string): string {
  const extranjero = escrito.trim();
  if (extranjero.length < 1 || extranjero.length > MAXIMO_DE_IDENTIFICACION) {
    throw new ReceptorInvalido('La identificación del extranjero va de 1 a 20 caracteres.');
  }
  return extranjero;
}

const VALIDADORES: Record<TipoDeIdentificacion, Validador> = {
  cf: validarConsumidorFinal,
  nit: validarNit,
  cui: validarCui,
  extranjero: validarExtranjero,
};

const identificacionValida = (tipo: TipoDeIdentificacion, escrito: string): string => VALIDADORES[tipo](escrito);

/**
 * A quién se le vendió. Sin cliente solo cabe el consumidor final («CF»). Con cliente, lo que el usuario no escribió
 * sale del cliente (su NIT, o su CUI, o «CF» si no tiene ninguno); toda identificación se valida y se normaliza.
 * @throws ClienteObligatorio o ReceptorInvalido.
 */
export function resolverReceptor(solicitado: ReceptorSolicitado, cliente: ClienteDelDocumento | null): Receptor {
  if (!cliente) return consumidorFinal(solicitado);
  const propia = texto(solicitado.nitReceptor);
  const deducida = identificacionDelCliente(cliente);
  const tipo = solicitado.tipoDeIdentificacion ?? (propia ? 'nit' : deducida.tipo);
  const escrito = propia || (tipo === deducida.tipo ? deducida.valor : '');
  return {
    tipoDeIdentificacion: tipo,
    nitReceptor: identificacionValida(tipo, escrito),
    nombreReceptor: nombreDelReceptor(solicitado, cliente),
  };
}
