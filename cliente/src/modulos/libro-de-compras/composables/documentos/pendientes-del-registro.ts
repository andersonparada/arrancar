import type { EdicionDeDocumento } from './edicion-de-documento';
import { pendientesDeFacturaAnterior } from './edicion-de-factura-anterior';
import { lineaCompleta, montoEnTexto, type LineaEnEdicion } from './lineas-del-documento';
import {
  esFacturaEspecial,
  esNotaDeDebito,
  esReciboFel,
  familiaDelCodigo,
  llevaFacturaAfectada,
} from './tipos-de-documento-sat';

/** Una línea sin concepto ni total es una fila que el usuario todavía no usa: se ignora. */
export const lineaEnBlanco = (linea: LineaEnEdicion): boolean =>
  !linea.conceptoId && montoEnTexto(linea.total) === null;

export const conLineasUsadas = (lineas: LineaEnEdicion[]) => lineas.filter((linea) => !lineaEnBlanco(linea));

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

/** Lo que falta de la factura que corrige la nota: elegirla del libro o escribir la del sistema anterior. */
function pendientesDeLaFacturaQueCorrige(edicion: EdicionDeDocumento): [boolean, string][] {
  if (!llevaFacturaAfectada(edicion.tipoDte)) return [];
  if (edicion.origenDeLaFactura === 'anterior') {
    return pendientesDeFacturaAnterior(edicion.facturaAnterior).map((texto) => [true, texto]);
  }
  return [[!edicion.documentoAfectadoId, textoDeLaFacturaPendiente(edicion)]];
}

/** «Otra causa» en una factura exige explicarla en las observaciones. */
const pendientesDeOtraCausa = (edicion: EdicionDeDocumento): [boolean, string][] => [
  [
    edicion.otraCausaSinCredito && edicion.observaciones.trim() === '',
    'explicar en las observaciones por qué no dio crédito fiscal',
  ],
];

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
    ...pendientesDeLaFacturaQueCorrige(edicion),
    [!edicion.muestraEnReportesSat && !edicion.motivoFueraDelLibro, 'decir por qué no se muestra en reportes SAT'],
    ...pendientesDeFacturaEspecial(edicion),
    ...pendientesDelReciboFel(edicion),
    ...pendientesDeOtraCausa(edicion),
    [usadas.length === 0, 'escribir al menos una línea'],
    [usadas.some((linea) => !lineaCompleta(linea)), 'completar las líneas (concepto y total)'],
  ];
  return pendientes.filter(([falta]) => falta).map(([, texto]) => texto);
}
