import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { CargoParaPagar, NotaParaLigar, ParaPagar } from '../../servicios/tipos-de-pagos';
import { etiquetaDeDocumento } from '../contrasenas/edicion-de-contrasena';
import { centavosDe, textoDeCentavos } from '../dinero';
import type { EdicionDePago, LineaDelPago } from './edicion-de-pago';
import { totalDelPago } from './edicion-de-pago';
import { esPosfechado } from './fechas-del-pago';

const mesLegible = (mes: string): string => `${mes.slice(5, 7)}/${mes.slice(0, 4)}`;
const conRetencion = (cargo: CargoParaPagar): boolean => (centavosDe(cargo.retencionPorDescontar) ?? 0) > 0;

/** Los avisos de la retención que este pago descuenta: constancia sin emitir y mes en que se entera. */
function avisosDeLaRetencion(cargo: CargoParaPagar, fecha: string): string[] {
  if (!conRetencion(cargo)) return [];
  const factura = etiquetaDeDocumento(cargo);
  const avisos: string[] = [];
  if (cargo.constanciasPendientes > 0) {
    avisos.push(
      `La retención de la factura ${factura} no tiene constancia registrada: emítala en Retenciones Web y entréguela con este pago.`,
    );
  }
  if (cargo.mesDeRetencion && cargo.mesDeRetencion < fecha.slice(0, 7)) {
    avisos.push(
      `La retención de la factura ${factura} es de ${mesLegible(cargo.mesDeRetencion)}: se entera con ese mes, aunque el pago sea después. Revísela en Libro de compras → Retenciones.`,
    );
  }
  return avisos;
}

/** Algún aviso habla de una constancia de retención sin emitir: se ofrece el enlace a las pendientes (R12). */
export const hayAvisoDeConstancia = (avisos: readonly string[]): boolean =>
  avisos.some((aviso) => /constancia/i.test(aviso));

function avisoDeRetencionesPorPracticar(cargo: CargoParaPagar): string[] {
  if ((centavosDe(cargo.retencionesPorPracticar) ?? 0) <= 0) return [];
  return [
    `El documento ${etiquetaDeDocumento(cargo)} tiene ${formatearMonto(cargo.retencionesPorPracticar)} de retenciones por practicar del sistema anterior: emita la constancia en Retenciones Web y entérela. Arrancar no las descuenta del pago.`,
  ];
}

/** Fecha anterior a la recepción de la factura (en el agro se paga antes de recibir el DTE) o a la de su contraseña. */
function avisosDeFechaAnterior(cargo: CargoParaPagar, fecha: string, datos: ParaPagar): string[] {
  const avisos: string[] = [];
  if (cargo.fechaDeRecepcion && fecha < cargo.fechaDeRecepcion) {
    avisos.push(
      `La fecha del pago es anterior a la recepción de la factura ${etiquetaDeDocumento(cargo)} (${formatearFecha(cargo.fechaDeRecepcion)}).`,
    );
  }
  const contrasena = datos.contrasenas.find(({ id }) => id === cargo.contrasenaId);
  if (contrasena?.fecha && fecha < contrasena.fecha) {
    avisos.push(
      `La fecha del pago es anterior a la fecha de la contraseña ${contrasena.numero} (${formatearFecha(contrasena.fecha)}).`,
    );
  }
  return avisos;
}

const avisosDeLaLinea = ({ cargo }: LineaDelPago, fecha: string, datos: ParaPagar): string[] => [
  ...avisosDeLaRetencion(cargo, fecha),
  ...avisoDeRetencionesPorPracticar(cargo),
  ...avisosDeFechaAnterior(cargo, fecha, datos),
];

function avisoDelPosfechado(edicion: EdicionDePago, hoy: string): string[] {
  if (edicion.forma === 'cuenta_de_apertura' || !esPosfechado(edicion.fecha, hoy)) return [];
  const aLaVista =
    edicion.forma === 'cheque' ? ' El cheque se paga a la vista: el proveedor puede cobrarlo antes.' : '';
  const quien = edicion.forma === 'cheque' ? 'El cheque' : 'La nota';
  return [
    `${quien} lleva fecha ${formatearFecha(edicion.fecha)}: el documento queda comprometido y se da por pagado en esa fecha.${aLaVista}`,
  ];
}

/**
 * La bancarización depende del régimen de la empresa y de cada documento: el servidor la decide y la responde al
 * registrar. Antes de confirmar solo se anticipa que el mes llega al umbral, sin afirmar qué se pierde.
 */
function avisoDeBancarizacion(lineas: readonly LineaDelPago[], datos: ParaPagar): string[] {
  const umbral = centavosDe(datos.umbralDeBancarizacion) ?? 0;
  if (umbral <= 0 || lineas.length === 0) return [];
  const suma = (centavosDe(datos.sumaDelMesAlProveedor) ?? 0) + totalDelPago(lineas);
  const unCargo = lineas.some(({ cargo }) => cargo.sobreUmbralDeBancarizacion);
  if (suma < umbral && !unCargo) return [];
  return [
    `Bancarización (Decreto 20-2006): con este pago, lo pagado a este proveedor en el mes llega a ${formatearMonto(textoDeCentavos(suma))} y el umbral es ${formatearMonto(datos.umbralDeBancarizacion)}. Al registrar, el sistema le dirá si afecta el costo o el crédito fiscal. Se recomienda emitir el cheque no negociable.`,
  ];
}

function avisoDeLaNota(edicion: EdicionDePago, nota: NotaParaLigar | null): string[] {
  if (edicion.forma !== 'nota_ligada' || !nota || !edicion.fecha) return [];
  if (nota.fecha.slice(0, 4) >= edicion.fecha.slice(0, 4)) return [];
  return [
    `La nota es del ${formatearFecha(nota.fecha)} y se aplica con fecha ${formatearFecha(edicion.fecha)}, de otro año: revise que corresponda a esas facturas.`,
  ];
}

export interface ContextoDeAvisos {
  edicion: EdicionDePago;
  datos: ParaPagar;
  lineas: readonly LineaDelPago[];
  hoy: string;
  nota: NotaParaLigar | null;
}

/** Los avisos que no bloquean, para leerlos antes de confirmar (el servidor responde los suyos y los de Bancos al registrar). */
export function avisosDelPago({ edicion, datos, lineas, hoy, nota }: ContextoDeAvisos): string[] {
  if (edicion.forma === 'cuenta_de_apertura') return [];
  const fecha = edicion.fecha || hoy;
  return [
    ...lineas.flatMap((linea) => avisosDeLaLinea(linea, fecha, datos)),
    ...avisoDelPosfechado(edicion, hoy),
    ...avisoDeLaNota(edicion, nota),
    ...avisoDeBancarizacion(lineas, datos),
  ];
}

/** Los avisos fijos de la cuenta de apertura (texto del contador). */
export function avisosDeApertura(datos: ParaPagar): string[] {
  const inicio = datos.fechaDeInicio ? formatearFecha(datos.fechaDeInicio) : '';
  return [
    'Use esta forma solo si el documento ya se había pagado antes de la fecha de inicio.',
    datos.cargaCerrada
      ? 'La carga inicial está cerrada: es una corrección de error de períodos anteriores. Avise a su contador, que elige la cuenta.'
      : `La carga inicial está abierta: se registra con la fecha de inicio (${inicio}) contra la cuenta puente de apertura.`,
  ];
}

/** Junto a la casilla de la diferencia, si el cargo tiene retención. */
export const AVISO_DE_DIFERENCIA_CON_RETENCION =
  'Si la diferencia viene de la retención (el proveedor calculó otra), no la salde: revise la retención en Libro de compras.';

export const tieneRetencion = (cargo: CargoParaPagar): boolean => conRetencion(cargo) || cargo.mesDeRetencion !== null;

/** Cuando la diferencia pasa del tope no se ofrece: el cargo queda pagado en parte. */
export const AVISO_DE_DESCUENTO =
  'Si el proveedor le hizo un descuento, pídale la nota de crédito (Ley del IVA, arts. 17 y 29).';
