import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { DestinoDeDocumento, DocumentoEnLista, MotivoFueraDelLibro } from '../../servicios/documentos.api';
import type { ProveedorParaRegistro } from '../../servicios/registro-de-documentos.api';
import { DESTINOS_DE_DOCUMENTO } from '../../textos-de-documentos';
import { OPCIONES_DE_MOTIVO_FUERA_DEL_LIBRO } from '../../textos-del-registro';
import type { EdicionDeDocumento } from './edicion-de-documento';
import { etiquetaDePeriodo, mesDe } from './filtros-de-documentos';
import {
  esFacturaEspecial,
  esNotaDeDebito,
  esReciboFel,
  familiaDelCodigo,
  llevaFacturaAfectada,
} from './tipos-de-documento-sat';

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

/**
 * Las facturas vigentes que una nota puede corregir: la más reciente primero. La nota de débito solo va sobre
 * facturas del libro (`soloEnElLibro`).
 */
export function opcionesDeFacturas(documentos: DocumentoEnLista[], soloEnElLibro = false) {
  return documentos
    .filter(({ tipo }) => TIPOS_QUE_SE_REBAJAN.includes(tipo))
    .filter(({ muestraEnReportesSat }) => muestraEnReportesSat || !soloEnElLibro)
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
 * La factura de una nota no sirve para la otra clase de nota (la de débito solo admite facturas del libro) y la clase
 * de cargo es solo de la nota de débito, que siempre va en el libro.
 */
function ajustarLaNota(edicion: EdicionDeDocumento, codigoAnterior: string): void {
  const familia = familiaDelCodigo(edicion.tipoDte);
  if (!llevaFacturaAfectada(edicion.tipoDte) || familia !== familiaDelCodigo(codigoAnterior)) {
    edicion.documentoAfectadoId = null;
  }
  if (!esNotaDeDebito(edicion.tipoDte)) {
    edicion.claseDeCargo = null;
    return;
  }
  edicion.muestraEnReportesSat = true;
  edicion.motivoFueraDelLibro = null;
  edicion.nitReceptor = '';
}

/** Lo que el formulario sabe al cambiar el tipo: el proveedor (para su NIT) y el NIT de la empresa (para el recibo FEL). */
export interface ContextoDelTipo {
  proveedor: ProveedorParaRegistro | undefined;
  nitDeLaEmpresa: string | null;
}

/** El recibo FEL va a nombre de la empresa: su NIT se propone como receptor, y el usuario lo puede cambiar. */
export function proponerElNitDeLaEmpresa(edicion: EdicionDeDocumento, nitDeLaEmpresa: string | null): void {
  if (esReciboFel(edicion.tipoDte) && edicion.nitReceptor.trim() === '') edicion.nitReceptor = nitDeLaEmpresa ?? '';
}

/** El recibo sin FEL va sin FEL; el recibo FEL (RECI, RDON) va fuera del libro con su motivo propio. */
function alElegirElRecibo(edicion: EdicionDeDocumento, codigoAnterior: string, nitDeLaEmpresa: string | null): void {
  edicion.muestraEnReportesSat = false;
  if (!esReciboFel(edicion.tipoDte)) {
    edicion.motivoFueraDelLibro = 'sin_fel';
    alCambiarElMotivo(edicion);
    return;
  }
  edicion.motivoFueraDelLibro = 'recibo_fel';
  if (!esReciboFel(codigoAnterior)) edicion.nitReceptor = nitDeLaEmpresa ?? '';
}

/**
 * Un recibo sin FEL nunca va en el libro; un recibo FEL (RECI, RDON) tampoco, pero su motivo es `recibo_fel`. Los
 * demás tipos vuelven al libro al dejar de ser recibos. La factura especial cambia quién es el emisor y el vendedor.
 */
export function alCambiarElTipo(edicion: EdicionDeDocumento, codigoAnterior: string, contexto: ContextoDelTipo): void {
  edicion.confirmarCambioDeRegimen = false;
  ajustarLaNota(edicion, codigoAnterior);
  if (esFacturaEspecial(edicion.tipoDte)) return prepararFacturaEspecial(edicion, contexto.proveedor);
  if (esFacturaEspecial(codigoAnterior)) soltarFacturaEspecial(edicion, contexto.proveedor);
  if (familiaDelCodigo(edicion.tipoDte) === 'recibo')
    return alElegirElRecibo(edicion, codigoAnterior, contexto.nitDeLaEmpresa);
  if (familiaDelCodigo(codigoAnterior) === 'recibo') alMarcarLaCasilla(edicion, true);
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

/** Los motivos que se eligen a mano, por nombre. El recibo FEL no se elige: lo pone Arrancar según el tipo. */
export function opcionesDeMotivo() {
  const motivos = Object.entries(OPCIONES_DE_MOTIVO_FUERA_DEL_LIBRO)
    .filter(([valor]) => valor !== 'recibo_fel')
    .map(([valor, texto]) => ({ valor: valor as Exclude<MotivoFueraDelLibro, 'recibo_fel'>, texto }));
  return porNombre(motivos);
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
