import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { DestinoDeDocumento, DocumentoEnLista, MotivoFueraDelLibro } from '../../servicios/documentos.api';
import type { ProveedorParaRegistro } from '../../servicios/registro-de-documentos.api';
import { DESTINOS_DE_DOCUMENTO } from '../../textos-de-documentos';
import type { EdicionDeDocumento } from './edicion-de-documento';
import { etiquetaDePeriodo, mesDe } from './filtros-de-documentos';
import { familiaDelCodigo } from './tipos-de-documento-sat';

const TIPOS_QUE_SE_REBAJAN = ['factura', 'factura_pequeno_contribuyente'];
const CONSUMIDOR_FINAL = 'CF';

const porNombre = <T extends { texto: string }>(opciones: T[]): T[] =>
  [...opciones].sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }));

/** Los proveedores por nombre, para el selector. */
export const opcionesDeProveedores = (proveedores: ProveedorParaRegistro[]) =>
  porNombre(proveedores.map(({ id, nombre }) => ({ valor: id, texto: nombre })));

/** Los destinos activos por nombre, para el selector. */
export const opcionesDeDestinos = (claves: DestinoDeDocumento[]) =>
  porNombre(claves.map((clave) => ({ valor: clave, texto: DESTINOS_DE_DOCUMENTO[clave] })));

/** Las facturas vigentes que una nota puede rebajar: la más reciente primero. */
export function opcionesDeFacturas(documentos: DocumentoEnLista[]) {
  return documentos
    .filter(({ tipo }) => TIPOS_QUE_SE_REBAJAN.includes(tipo))
    .sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision))
    .map((documento) => ({
      valor: documento.id,
      texto: `${documento.serie ? `${documento.serie}-` : ''}${documento.numero} · ${formatearFecha(documento.fechaEmision)} · ${formatearMonto(documento.total)}`,
      destino: documento.destino,
    }));
}

const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * El período del libro: «el propuesto» (vacío) y los últimos meses, del más reciente al más antiguo. El propuesto
 * se muestra con el mes que calculó el servidor.
 */
export function opcionesDePeriodoDelDocumento(hoy: Date, actual: string, propuesto: string | null) {
  const meses = Array.from({ length: 24 }, (_, atras) => mesDe(new Date(hoy.getFullYear(), hoy.getMonth() - atras, 1)));
  const todos = actual && !meses.includes(actual) ? [...meses, actual] : meses;
  const textoPropuesto = propuesto ? `Propuesto: ${etiquetaDePeriodo(propuesto)}` : 'El propuesto por el sistema';
  return [
    { valor: '', texto: textoPropuesto },
    ...todos.map((mes) => ({ valor: mes, texto: conMayuscula(etiquetaDePeriodo(mes)) })),
  ];
}

/** Un recibo no es un documento FEL, así que nunca va en el libro; los demás tipos vuelven a él al dejar de serlo. */
export function alCambiarElTipo(edicion: EdicionDeDocumento, codigoAnterior: string): void {
  const familia = familiaDelCodigo(edicion.tipoDte);
  edicion.confirmarCambioDeRegimen = false;
  if (familia !== 'nota_de_credito') edicion.documentoAfectadoId = null;
  if (familia === 'recibo') {
    edicion.muestraEnReportesSat = false;
    edicion.motivoFueraDelLibro = 'sin_fel';
  } else if (familiaDelCodigo(codigoAnterior) === 'recibo') {
    alMarcarLaCasilla(edicion, true);
  }
}

/** Marcar la casilla vuelve al libro; desmarcarla pide el motivo (por omisión, sin FEL). */
export function alMarcarLaCasilla(edicion: EdicionDeDocumento, marcada: boolean): void {
  edicion.muestraEnReportesSat = marcada;
  edicion.motivoFueraDelLibro = marcada ? null : (edicion.motivoFueraDelLibro ?? 'sin_fel');
  if (marcada) edicion.nitReceptor = '';
  else alCambiarElMotivo(edicion);
}

/** Sin FEL no hay autorización ni receptor; a consumidor final el receptor es «CF». */
export function alCambiarElMotivo(edicion: EdicionDeDocumento): void {
  const motivo: MotivoFueraDelLibro | null = edicion.motivoFueraDelLibro;
  if (motivo === 'sin_fel') {
    edicion.autorizacionFel = '';
    edicion.nitReceptor = '';
  } else if (motivo === 'fel_a_consumidor_final' && edicion.nitReceptor.trim() === '') {
    edicion.nitReceptor = CONSUMIDOR_FINAL;
  } else if (motivo === 'fel_a_otro_nit' && edicion.nitReceptor === CONSUMIDOR_FINAL) {
    edicion.nitReceptor = '';
  }
}

/** El emisor de la factura es el proveedor: al elegirlo se pone su NIT (o se deja vacío para escribir el del documento). */
export function alElegirProveedor(edicion: EdicionDeDocumento, proveedor: ProveedorParaRegistro | undefined): void {
  edicion.confirmarCambioDeRegimen = false;
  edicion.respuestasFiscales = {};
  edicion.documentoAfectadoId = null;
  edicion.nitEmisor = proveedor?.nit && proveedor.nit !== CONSUMIDOR_FINAL ? proveedor.nit : '';
}
