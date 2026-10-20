import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DestinoDeDocumento, MotivoFueraDelLibro } from '../../servicios/documentos.api';
import type { RetencionDeDocumento } from '../../servicios/documentos.api';
import type { ClaseDeCargo, LineaSolicitada, SolicitudDeDocumento } from '../../servicios/registro-de-documentos.api';
import { ajustesParaElCuerpo, type AjustesEnEdicion } from './ajustes-de-retenciones';
import {
  lineaCompleta,
  lineaParaElCuerpo,
  lineaVacia,
  montoEnTexto,
  type LineaEnEdicion,
} from './lineas-del-documento';
import { datosFiscalesContestados, type RespuestasFiscales } from './preguntas-fiscales';
import {
  esFacturaEspecial,
  esNotaDeDebito,
  esReciboFel,
  familiaDelCodigo,
  llevaFacturaAfectada,
} from './tipos-de-documento-sat';

type Valor = string | number | null | undefined;

/** El formulario de un documento tal como lo ve el usuario; el período va como `AAAA-MM` y vacío es «el propuesto». */
export interface EdicionDeDocumento {
  /** El código de la SAT que dice el encabezado de la factura (o el del recibo sin FEL); la familia sale de él. */
  tipoDte: string;
  proveedorId: string | null;
  destino: DestinoDeDocumento | null;
  documentoAfectadoId: string | null;
  /** Solo en la nota de débito; vacío es «sin indicar». */
  claseDeCargo: ClaseDeCargo | null;
  numero: string;
  serie: string;
  fechaEmision: string;
  fechaRecepcion: string;
  periodo: string;
  muestraEnReportesSat: boolean;
  motivoFueraDelLibro: MotivoFueraDelLibro | null;
  nitEmisor: string;
  autorizacionFel: string;
  nitReceptor: string;
  noVinculado: boolean;
  ivaDeLaFel: Valor;
  observaciones: string;
  lineas: LineaEnEdicion[];
  ajustes: AjustesEnEdicion;
  respuestasFiscales: RespuestasFiscales;
  confirmarCambioDeRegimen: boolean;
}

/** Para qué se arma el cuerpo: la vista previa tolera lo incompleto; registrar no. */
export type FinalidadDelCuerpo = 'previa' | 'registro';

const DESTINO_DE_LA_VISTA_PREVIA: DestinoDeDocumento = 'cuentas-por-pagar';

const dosDigitos = (numero: number) => String(numero).padStart(2, '0');

/** La fecha del equipo como `AAAA-MM-DD`. */
export const fechaEnTexto = (fecha: Date): string =>
  `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;

const SIN_FACTURA_AFECTADA = { documentoAfectadoId: null, claseDeCargo: null };

/** Un documento nuevo: factura, en el libro, emitida hoy y con una línea en blanco. */
export function edicionVacia(hoy: Date): EdicionDeDocumento {
  return {
    tipoDte: 'FACT',
    proveedorId: null,
    destino: null,
    ...SIN_FACTURA_AFECTADA,
    numero: '',
    serie: '',
    fechaEmision: fechaEnTexto(hoy),
    fechaRecepcion: '',
    periodo: '',
    muestraEnReportesSat: true,
    motivoFueraDelLibro: null,
    nitEmisor: '',
    autorizacionFel: '',
    nitReceptor: '',
    noVinculado: false,
    ivaDeLaFel: '',
    observaciones: '',
    lineas: [lineaVacia()],
    ajustes: {},
    respuestasFiscales: {},
    confirmarCambioDeRegimen: false,
  };
}

/** Una línea sin concepto ni total es una fila que el usuario todavía no usa: se ignora. */
export const lineaEnBlanco = (linea: LineaEnEdicion): boolean =>
  !linea.conceptoId && montoEnTexto(linea.total) === null;

const conLineasUsadas = (lineas: LineaEnEdicion[]) => lineas.filter((linea) => !lineaEnBlanco(linea));

/** La factura especial exige el vendedor, la serie y la autorización de la FEL que emitió la empresa. */
function pendientesDeFacturaEspecial(edicion: EdicionDeDocumento): [boolean, string][] {
  if (!esFacturaEspecial(edicion.tipoDte)) return [];
  return [
    [edicion.nitReceptor.trim() === '', 'escribir el NIT o CUI del vendedor'],
    [edicion.serie.trim() === '', 'escribir la serie de la factura especial'],
    [edicion.autorizacionFel.trim() === '', 'escribir la autorización de la FEL'],
  ];
}

const textoDeLaFacturaPendiente = (edicion: EdicionDeDocumento): string =>
  esNotaDeDebito(edicion.tipoDte) ? 'elegir la factura que aumenta la nota' : 'elegir la factura que rebaja la nota';

/** Un recibo FEL (RECI, RDON) lleva el número de autorización de la FEL, como toda FEL. */
function pendientesDelReciboFel(edicion: EdicionDeDocumento): [boolean, string][] {
  return [
    [esReciboFel(edicion.tipoDte) && edicion.autorizacionFel.trim() === '', 'escribir la autorización de la FEL'],
  ];
}

/** Lo que falta para poder registrar, en lenguaje del usuario; vacío si ya se puede. */
export function pendientesDelRegistro(edicion: EdicionDeDocumento): string[] {
  const usadas = conLineasUsadas(edicion.lineas);
  const pendientes: [boolean, string][] = [
    [!edicion.proveedorId, 'elegir el proveedor'],
    [edicion.numero.trim() === '', 'escribir el número del documento'],
    [edicion.fechaEmision === '', 'poner la fecha de emisión'],
    [!familiaDelCodigo(edicion.tipoDte), 'elegir el tipo de documento'],
    [llevaFacturaAfectada(edicion.tipoDte) && !edicion.documentoAfectadoId, textoDeLaFacturaPendiente(edicion)],
    [!edicion.muestraEnReportesSat && !edicion.motivoFueraDelLibro, 'decir por qué no se muestra en reportes SAT'],
    ...pendientesDeFacturaEspecial(edicion),
    ...pendientesDelReciboFel(edicion),
    [usadas.length === 0, 'escribir al menos una línea'],
    [usadas.some((linea) => !lineaCompleta(linea)), 'completar las líneas (concepto y total)'],
  ];
  return pendientes.filter(([falta]) => falta).map(([, texto]) => texto);
}

const tieneFel = (edicion: EdicionDeDocumento): boolean =>
  edicion.muestraEnReportesSat || edicion.motivoFueraDelLibro !== 'sin_fel';

/**
 * Con FEL se manda el código de la SAT (también el de un recibo FEL); sin ella, solo la familia (el servidor
 * rechaza un código sin FEL).
 */
function tipoDelCuerpo(edicion: EdicionDeDocumento) {
  const familia = familiaDelCodigo(edicion.tipoDte);
  const conCodigo = familia !== 'recibo' || esReciboFel(edicion.tipoDte);
  return familia && conCodigo && tieneFel(edicion) ? { tipoDte: edicion.tipoDte } : { tipo: familia ?? undefined };
}

function datosDeLaFel(edicion: EdicionDeDocumento) {
  const enElLibro = edicion.muestraEnReportesSat;
  const conFel = tieneFel(edicion);
  const especial = esFacturaEspecial(edicion.tipoDte);
  return {
    // En la factura especial el emisor es la empresa (lo pone el servidor) y el receptor es el vendedor.
    nitEmisor: enElLibro && !especial ? textoONulo(edicion.nitEmisor) : null,
    autorizacionFel: conFel ? textoONulo(edicion.autorizacionFel) : null,
    nitReceptor: (!enElLibro || especial) && conFel ? textoONulo(edicion.nitReceptor) : null,
    motivoFueraDelLibro: enElLibro ? null : edicion.motivoFueraDelLibro,
  };
}

function lineasDelCuerpo(edicion: EdicionDeDocumento): LineaSolicitada[] {
  const conMontosExtra = !esFacturaEspecial(edicion.tipoDte);
  return conLineasUsadas(edicion.lineas).flatMap((linea) => lineaParaElCuerpo(linea, conMontosExtra) ?? []);
}

const destinoDelCuerpo = (edicion: EdicionDeDocumento, finalidad: FinalidadDelCuerpo): DestinoDeDocumento | null =>
  edicion.destino ?? (finalidad === 'previa' ? DESTINO_DE_LA_VISTA_PREVIA : null);

/** Falta el tipo, el número, la fecha o toda línea completa. */
const sinLoBasico = (edicion: EdicionDeDocumento, lineas: LineaSolicitada[]): boolean =>
  !familiaDelCodigo(edicion.tipoDte) || !edicion.numero.trim() || !edicion.fechaEmision || lineas.length === 0;

/** Para registrar no se acepta una línea a medias: en la vista previa simplemente no se cuenta. */
const hayLineasAMedias = (edicion: EdicionDeDocumento, lineas: LineaSolicitada[], finalidad: FinalidadDelCuerpo) =>
  finalidad === 'registro' && lineas.length !== conLineasUsadas(edicion.lineas).length;

const faltaLoBasico = (edicion: EdicionDeDocumento, lineas: LineaSolicitada[], finalidad: FinalidadDelCuerpo) =>
  sinLoBasico(edicion, lineas) || hayLineasAMedias(edicion, lineas, finalidad);

function encabezadoDelCuerpo(edicion: EdicionDeDocumento) {
  return {
    ...tipoDelCuerpo(edicion),
    ...datosDeLaFel(edicion),
    serie: textoONulo(edicion.serie),
    numero: edicion.numero.trim(),
    noVinculado: edicion.noVinculado,
    fechaEmision: edicion.fechaEmision,
    fechaRecepcion: textoONulo(edicion.fechaRecepcion),
    periodo: edicion.periodo ? `${edicion.periodo}-01` : null,
    documentoAfectadoId: llevaFacturaAfectada(edicion.tipoDte) ? edicion.documentoAfectadoId : null,
    claseDeCargo: esNotaDeDebito(edicion.tipoDte) ? edicion.claseDeCargo : null,
    ivaDeLaFel: montoEnTexto(edicion.ivaDeLaFel),
    observaciones: textoONulo(edicion.observaciones),
  };
}

/**
 * El cuerpo de calcular o registrar. Devuelve `null` si aún no hay con qué pedir nada (proveedor, número, fecha y
 * al menos una línea completa); para registrar, además, el destino elegido y ninguna línea a medias.
 * `retenciones` son las propuestas del último cálculo: solo ellas pueden llevar ajuste.
 */
export function cuerpoDeDocumento(
  edicion: EdicionDeDocumento,
  retenciones: RetencionDeDocumento[],
  finalidad: FinalidadDelCuerpo,
): SolicitudDeDocumento | null {
  const lineas = lineasDelCuerpo(edicion);
  const destino = destinoDelCuerpo(edicion, finalidad);
  const { proveedorId } = edicion;
  if (!proveedorId || !destino || faltaLoBasico(edicion, lineas, finalidad)) return null;
  return {
    ...encabezadoDelCuerpo(edicion),
    proveedorId,
    destino,
    lineas,
    ajustesDeRetenciones: ajustesParaElCuerpo(edicion.ajustes, retenciones, finalidad === 'previa'),
    datosFiscalesDelProveedor: datosFiscalesContestados(edicion.respuestasFiscales),
    confirmarCambioDeRegimen: edicion.confirmarCambioDeRegimen,
  };
}
