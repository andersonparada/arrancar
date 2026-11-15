import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DestinoDeDocumento, MotivoFueraDelLibro } from '../../servicios/documentos.api';
import type { RetencionDeDocumento } from '../../servicios/documentos.api';
import type { ClaseDeCargo, LineaSolicitada, SolicitudDeDocumento } from '../../servicios/registro-de-documentos.api';
import {
  cuerpoDeFacturaAnterior,
  facturaAnteriorVacia,
  type FacturaAnteriorEnEdicion,
  type OrigenDeLaFactura,
} from './edicion-de-factura-anterior';
import { ajustesParaElCuerpo, type AjustesEnEdicion } from './ajustes-de-retenciones';
import { lineaParaElCuerpo, lineaVacia, montoEnTexto, type LineaEnEdicion } from './lineas-del-documento';
import { conLineasUsadas } from './pendientes-del-registro';
import { datosFiscalesContestados, type RespuestasFiscales } from './preguntas-fiscales';
import {
  esFacturaEspecial,
  esNotaDeDebito,
  esReciboFel,
  esUnaFactura,
  familiaDelCodigo,
  llevaFacturaAfectada,
} from './tipos-de-documento-sat';

export { lineaEnBlanco, pendientesDelRegistro } from './pendientes-del-registro';

type Valor = string | number | null | undefined;

/** El formulario de un documento tal como lo ve el usuario; el período va como `AAAA-MM` y vacío es «el propuesto». */
export interface EdicionDeDocumento {
  /** El código de la SAT que dice el encabezado de la factura (o el del recibo sin FEL); la familia sale de él. */
  tipoDte: string;
  proveedorId: string | null;
  destino: DestinoDeDocumento | null;
  documentoAfectadoId: string | null;
  /** Solo en una nota: si la factura que corrige es del libro (`documentoAfectadoId`) o del sistema anterior. */
  origenDeLaFactura: OrigenDeLaFactura;
  facturaAnterior: FacturaAnteriorEnEdicion;
  /** Solo en una factura: «No dio crédito por otra causa»; exige explicarla en las observaciones. */
  otraCausaSinCredito: boolean;
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

/** Lo de la factura que corrige una nota y de «otra causa», sin llenar: una factura común no lo usa. */
const sinFacturaQueCorrige = () => ({
  documentoAfectadoId: null,
  claseDeCargo: null,
  origenDeLaFactura: 'libro' as OrigenDeLaFactura,
  otraCausaSinCredito: false,
  facturaAnterior: facturaAnteriorVacia(),
});

/** Un documento nuevo: factura, en el libro, emitida hoy y con una línea en blanco. */
export function edicionVacia(hoy: Date): EdicionDeDocumento {
  return {
    tipoDte: 'FACT',
    proveedorId: null,
    destino: null,
    ...sinFacturaQueCorrige(),
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

/** La factura que corrige una nota: la del libro o la del sistema anterior, nunca las dos. */
function facturaQueCorrigeDelCuerpo(edicion: EdicionDeDocumento) {
  const esNota = llevaFacturaAfectada(edicion.tipoDte);
  const anterior = esNota && edicion.origenDeLaFactura === 'anterior';
  return {
    documentoAfectadoId: esNota && !anterior ? edicion.documentoAfectadoId : null,
    facturaAnterior: anterior ? cuerpoDeFacturaAnterior(edicion.facturaAnterior) : null,
  };
}

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
    ...facturaQueCorrigeDelCuerpo(edicion),
    otraCausaSinCredito: esUnaFactura(edicion.tipoDte) && edicion.otraCausaSinCredito,
    claseDeCargo: esNotaDeDebito(edicion.tipoDte) ? edicion.claseDeCargo : null,
    ivaDeLaFel: montoEnTexto(edicion.ivaDeLaFel),
    observaciones: textoONulo(edicion.observaciones),
  };
}

/** Una nota con factura anterior a medias no se calcula ni se registra: el formulario dice qué falta. */
const faltaLaFacturaAnterior = (edicion: EdicionDeDocumento, facturaAnterior: unknown): boolean =>
  edicion.origenDeLaFactura === 'anterior' && llevaFacturaAfectada(edicion.tipoDte) && !facturaAnterior;

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
  const encabezado = encabezadoDelCuerpo(edicion);
  if (faltaLaFacturaAnterior(edicion, encabezado.facturaAnterior)) return null;
  return {
    ...encabezado,
    proveedorId,
    destino,
    lineas,
    ajustesDeRetenciones: ajustesParaElCuerpo(edicion.ajustes, retenciones, finalidad === 'previa'),
    datosFiscalesDelProveedor: datosFiscalesContestados(edicion.respuestasFiscales),
    confirmarCambioDeRegimen: edicion.confirmarCambioDeRegimen,
  };
}
