import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type {
  ClienteParaVentas,
  DatosDeDocumento,
  DestinoDeDocumento,
  TipoDeDocumento,
  TipoDeIdentificacion,
} from '../../servicios/documentos.api';
import { centavosDe, datosDeLinea, lineaVacia, pendientesDeLineas, type LineaEnEdicion } from './lineas-del-documento';
import { CODIGOS_DTE_DE_LA_FAMILIA, esNota } from './tipos-de-documento';

/** La factura de un sistema anterior que corrige una nota. */
export interface FacturaAnteriorEnEdicion {
  serie: string;
  numero: string;
  fecha: string;
}

/** Todo lo que se escribe al registrar un documento; el texto vacío es «sin dato». */
export interface EdicionDeDocumento {
  tipo: TipoDeDocumento;
  /** Código de la SAT; solo se manda si el documento tiene autorización FEL. */
  tipoDte: string;
  clienteId: string | null;
  /** Vacío: se deduce del cliente (o consumidor final). */
  tipoDeIdentificacion: TipoDeIdentificacion | '';
  nitReceptor: string;
  nombreReceptor: string;
  serie: string;
  numero: string;
  autorizacionFel: string;
  fechaEmision: string;
  documentoAfectadoId: string | null;
  usaFacturaAnterior: boolean;
  facturaAnterior: FacturaAnteriorEnEdicion;
  /** Vacío: lo decide el sistema según la configuración. */
  destino: '' | DestinoDeDocumento | 'ninguno';
  ivaDelDte: string;
  observaciones: string;
  lineas: LineaEnEdicion[];
}

const dosDigitos = (numero: number) => String(numero).padStart(2, '0');

/** La fecha de una `Date` como `AAAA-MM-DD`, con la hora del equipo. */
export const fechaDe = (fecha: Date): string =>
  `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;

/** El formulario en blanco: una factura de hoy con una línea vacía. */
export function edicionVacia(hoy: Date): EdicionDeDocumento {
  return {
    tipo: 'factura',
    tipoDte: '',
    clienteId: null,
    tipoDeIdentificacion: '',
    nitReceptor: '',
    nombreReceptor: '',
    serie: '',
    numero: '',
    autorizacionFel: '',
    fechaEmision: fechaDe(hoy),
    documentoAfectadoId: null,
    usaFacturaAnterior: false,
    facturaAnterior: { serie: '', numero: '', fecha: '' },
    destino: '',
    ivaDelDte: '',
    observaciones: '',
    lineas: [lineaVacia()],
  };
}

/** Conserva el código si cabe en la nueva familia; si la familia tiene uno solo, lo pone; si no, queda por escoger. */
function codigoParaElTipo(tipo: TipoDeDocumento, actual: string): string {
  const codigos = CODIGOS_DTE_DE_LA_FAMILIA[tipo];
  if (codigos.includes(actual)) return actual;
  return codigos.length === 1 ? (codigos[0] ?? '') : '';
}

/** Cambia el tipo y suelta lo que ya no cabe: el código de la SAT de otra familia y lo propio de las notas. */
export function conTipo(edicion: EdicionDeDocumento, tipo: TipoDeDocumento): EdicionDeDocumento {
  const tipoDte = codigoParaElTipo(tipo, edicion.tipoDte);
  if (esNota(tipo)) return { ...edicion, tipo, tipoDte };
  return { ...edicion, tipo, tipoDte, documentoAfectadoId: null, usaFacturaAnterior: false };
}

/** Cambia el cliente; la factura que corregía una nota era de otro cliente, así que se suelta. */
export function conCliente(edicion: EdicionDeDocumento, cliente: string | null): EdicionDeDocumento {
  if (cliente === edicion.clienteId) return edicion;
  return { ...edicion, clienteId: cliente, documentoAfectadoId: null };
}

/**
 * El formulario para el documento que sigue de una serie: se queda con el tipo, la fecha, el cliente y el destino, y
 * deja en blanco lo que cambia en cada documento (número, FEL, líneas y notas).
 */
export function edicionParaOtro(edicion: EdicionDeDocumento): EdicionDeDocumento {
  const { tipo, fechaEmision, clienteId, destino, serie } = edicion;
  return {
    ...edicionVacia(new Date()),
    tipo,
    tipoDte: codigoParaElTipo(tipo, ''),
    fechaEmision,
    clienteId,
    destino,
    serie,
  };
}

/** Qué NIT se verá como pista del cliente escogido; vacío si no hay o no tiene. */
export function nitDelCliente(clientes: readonly ClienteParaVentas[], clienteId: string | null): string {
  return clientes.find((cliente) => cliente.id === clienteId)?.nit ?? '';
}

const tieneFel = (edicion: EdicionDeDocumento): boolean => edicion.autorizacionFel.trim() !== '';

function datosDeLaNota(edicion: EdicionDeDocumento): Pick<DatosDeDocumento, 'documentoAfectadoId' | 'facturaAnterior'> {
  if (!esNota(edicion.tipo)) return { documentoAfectadoId: null, facturaAnterior: null };
  if (!edicion.usaFacturaAnterior) return { documentoAfectadoId: edicion.documentoAfectadoId, facturaAnterior: null };
  const { serie, numero, fecha } = edicion.facturaAnterior;
  return { documentoAfectadoId: null, facturaAnterior: { serie: textoONulo(serie), numero: numero.trim(), fecha } };
}

/** Lo que se manda al servidor: lo vacío como `null`, sin destino si lo decide el sistema, y nada calculado. */
export function datosDeDocumento(edicion: EdicionDeDocumento): DatosDeDocumento {
  const destino = edicion.destino ? { destino: edicion.destino } : {};
  return {
    tipo: edicion.tipo,
    tipoDte: tieneFel(edicion) ? textoONulo(edicion.tipoDte) : null,
    clienteId: edicion.clienteId,
    tipoDeIdentificacion: edicion.tipoDeIdentificacion || null,
    nitReceptor: textoONulo(edicion.nitReceptor),
    nombreReceptor: textoONulo(edicion.nombreReceptor),
    serie: textoONulo(edicion.serie),
    numero: edicion.numero.trim(),
    autorizacionFel: textoONulo(edicion.autorizacionFel),
    fechaEmision: edicion.fechaEmision,
    ...datosDeLaNota(edicion),
    ...destino,
    ivaDelDte: textoONulo(edicion.ivaDelDte),
    observaciones: textoONulo(edicion.observaciones),
    lineas: edicion.lineas.map(datosDeLinea),
  };
}

/** El servidor pidió el IVA de la nota (0 es válido): mientras siga vacío, falta. */
export function pendientesDelIvaDeLaNota(edicion: EdicionDeDocumento, pedido: boolean): string[] {
  const sinIva = edicion.ivaDelDte.trim() === '';
  return pedido && esNota(edicion.tipo) && edicion.usaFacturaAnterior && sinIva
    ? ['el IVA que dice la nota (escriba 0 si no lleva)']
    : [];
}

function pendientesDeLaNota(edicion: EdicionDeDocumento): string[] {
  if (!esNota(edicion.tipo)) return [];
  if (!edicion.usaFacturaAnterior) return edicion.documentoAfectadoId ? [] : ['la factura que corrige la nota'];
  const { numero, fecha } = edicion.facturaAnterior;
  return [
    numero.trim() ? '' : 'el número de la factura anterior',
    fecha ? '' : 'la fecha de la factura anterior',
  ].filter(Boolean);
}

/** Lo que falta para poder registrar, en frases cortas («falta el número, el total de la línea»). */
export function pendientesDeEdicion(edicion: EdicionDeDocumento): string[] {
  const propios = [
    edicion.numero.trim() ? '' : 'el número del documento',
    edicion.fechaEmision ? '' : 'la fecha de emisión',
    !tieneFel(edicion) || edicion.tipoDte ? '' : 'el código de la SAT del documento electrónico',
    Object.keys(erroresDeEdicion(edicion)).length === 0 ? '' : 'corregir el IVA del DTE',
  ];
  return [...propios.filter(Boolean), ...pendientesDeLaNota(edicion), ...pendientesDeLineas(edicion.lineas)];
}

/** Errores de lo escrito que se pueden ver antes de molestar al servidor, por campo. */
export function erroresDeEdicion(edicion: EdicionDeDocumento): Record<string, string> {
  const errores: Record<string, string> = {};
  if (edicion.ivaDelDte.trim() !== '' && centavosDe(edicion.ivaDelDte) === null) {
    errores.ivaDelDte = 'Escriba solo números, con hasta dos decimales.';
  }
  return errores;
}
