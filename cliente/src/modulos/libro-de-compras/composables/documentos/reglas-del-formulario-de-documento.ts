import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { DestinoDeDocumento, DocumentoEnLista, MotivoFueraDelLibro } from '../../servicios/documentos.api';
import type { ProveedorParaRegistro } from '../../servicios/registro-de-documentos.api';
import { DESTINOS_DE_DOCUMENTO } from '../../textos-de-documentos';
import type { EdicionDeDocumento } from './edicion-de-documento';
import { etiquetaDePeriodo, mesDe } from './filtros-de-documentos';
import { esFacturaEspecial, familiaDelCodigo } from './tipos-de-documento-sat';

/** Las mismas familias que acepta el servidor (`resolutor-de-factura.ts`); la factura especial no se rebaja (R2-e). */
const TIPOS_QUE_SE_REBAJAN = [
  'factura',
  'factura_pequeno_contribuyente',
  'factura_pequeno_contribuyente_electronico',
  'factura_contribuyente_agropecuario',
  'factura_primario_pecuario',
];
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

const nitDelProveedor = (proveedor: ProveedorParaRegistro | undefined): string =>
  proveedor?.nit && proveedor.nit !== CONSUMIDOR_FINAL ? proveedor.nit : '';

/** El vendedor de una factura especial se propone con el NIT del proveedor o, si no tiene, con su DPI (CUI). */
export function vendedorPropuesto(proveedor: ProveedorParaRegistro | undefined): string {
  return nitDelProveedor(proveedor) || proveedor?.dpi || '';
}

/** La factura especial la emite la empresa: el emisor es ella, el vendedor es el proveedor y se recibe el día que se emite. */
function prepararFacturaEspecial(edicion: EdicionDeDocumento, proveedor: ProveedorParaRegistro | undefined): void {
  edicion.muestraEnReportesSat = true;
  edicion.motivoFueraDelLibro = null;
  edicion.nitEmisor = '';
  edicion.nitReceptor = vendedorPropuesto(proveedor);
  edicion.fechaRecepcion = edicion.fechaEmision;
}

/** Al dejar la factura especial el vendedor y la recepción propuestos ya no valen; el emisor vuelve a ser el proveedor. */
function soltarFacturaEspecial(edicion: EdicionDeDocumento, proveedor: ProveedorParaRegistro | undefined): void {
  edicion.nitReceptor = '';
  edicion.fechaRecepcion = '';
  edicion.nitEmisor = nitDelProveedor(proveedor);
}

/**
 * Un recibo no es un documento FEL, así que nunca va en el libro; los demás tipos vuelven a él al dejar de serlo.
 * La factura especial cambia quién es el emisor y quién el vendedor.
 */
export function alCambiarElTipo(
  edicion: EdicionDeDocumento,
  codigoAnterior: string,
  proveedor?: ProveedorParaRegistro,
): void {
  const familia = familiaDelCodigo(edicion.tipoDte);
  edicion.confirmarCambioDeRegimen = false;
  if (familia !== 'nota_de_credito') edicion.documentoAfectadoId = null;
  if (esFacturaEspecial(edicion.tipoDte)) return prepararFacturaEspecial(edicion, proveedor);
  if (esFacturaEspecial(codigoAnterior)) soltarFacturaEspecial(edicion, proveedor);
  if (familia === 'recibo') {
    edicion.muestraEnReportesSat = false;
    edicion.motivoFueraDelLibro = 'sin_fel';
  } else if (familiaDelCodigo(codigoAnterior) === 'recibo') {
    alMarcarLaCasilla(edicion, true);
  }
}

/** En la factura especial la recepción acompaña a la emisión mientras el usuario no la haya cambiado. */
export function alCambiarLaEmision(edicion: EdicionDeDocumento, emisionAnterior: string): void {
  if (!esFacturaEspecial(edicion.tipoDte)) return;
  if (edicion.fechaRecepcion === '' || edicion.fechaRecepcion === emisionAnterior) {
    edicion.fechaRecepcion = edicion.fechaEmision;
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

/** El emisor de la factura es el proveedor: al elegirlo se pone su NIT (o se deja vacío para escribir el del documento).
 * En la factura especial el proveedor es el vendedor: se propone su NIT o CUI como receptor. */
export function alElegirProveedor(edicion: EdicionDeDocumento, proveedor: ProveedorParaRegistro | undefined): void {
  edicion.confirmarCambioDeRegimen = false;
  edicion.respuestasFiscales = {};
  edicion.documentoAfectadoId = null;
  const especial = esFacturaEspecial(edicion.tipoDte);
  edicion.nitEmisor = especial ? '' : nitDelProveedor(proveedor);
  if (especial) edicion.nitReceptor = vendedorPropuesto(proveedor);
}
