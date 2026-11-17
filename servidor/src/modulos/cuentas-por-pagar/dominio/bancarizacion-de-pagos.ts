import { quetzales } from './avisos.js';

/** Qué pierde la empresa si el pago no está bancarizado: el crédito fiscal del IVA y/o la deducción del ISR. */
export interface EfectoFiscal {
  iva: boolean;
  isr: boolean;
}

export const SIN_EFECTO_FISCAL: EfectoFiscal = { iva: false, isr: false };

/** Los dos efectos juntos: lo que pierde el pago es la unión de lo que pierde cada uno de sus cargos. */
export function unirEfectos(efectos: readonly EfectoFiscal[]): EfectoFiscal {
  return { iva: efectos.some(({ iva }) => iva), isr: efectos.some(({ isr }) => isr) };
}

/** Un pago en efectivo vigente del mes, con el número de su recibo y lo que perdería. */
export interface PagoEnEfectivoDelMes {
  numero: string;
  efecto: EfectoFiscal;
}

export interface EntradaDeBancarizacion {
  proveedorNombre: string;
  /** `AAAA-MM-DD`: la fecha del pago, que fija el mes calendario (en un posfechado, la del cheque). */
  fecha: string;
  umbralCentavos: number;
  /** Lo que este pago entrega a los cargos, antes de retenciones. */
  montoDelPagoCentavos: number;
  /** El total de cada cargo del pago: una operación de ese monto o más se trata como una sola, aunque se pague por partes. */
  totalesDeLosCargosCentavos: readonly number[];
  /** Lo ya pagado al proveedor en el mes con cheques, notas de débito, notas ligadas y efectivo vigentes. */
  pagadoEnElMesCentavos: number;
  efectivoDelMes: readonly PagoEnEfectivoDelMes[];
  /** Lo que pierde el pago si no se bancariza; `null` si la empresa no tiene datos fiscales para saberlo. */
  efectoDelPago: EfectoFiscal | null;
}

export const AVISO_DE_DATOS_FISCALES =
  'Complete los datos fiscales de la empresa en Libro de compras para saber si la bancarización (Decreto 20-2006) afecta el costo o el crédito fiscal de este pago.';

/** `AAAA-MM-DD` como `mm/aaaa`. */
export const mesLegible = (fecha: string): string => `${fecha.slice(5, 7)}/${fecha.slice(0, 4)}`;

function textoDelAviso(umbralCentavos: number): string {
  return `Bancarización (Decreto 20-2006): los pagos a un mismo proveedor que suman ${quetzales(umbralCentavos)} o más en el mes deben hacerse por medios bancarios (cheque, transferencia o tarjeta) a nombre del proveedor para que el gasto y el crédito fiscal se puedan respaldar. Se recomienda emitir el cheque no negociable.`;
}

function lo(efecto: EfectoFiscal): string {
  const partes = [efecto.isr ? 'el costo' : null, efecto.iva ? 'el crédito fiscal' : null];
  return partes.filter(Boolean).join(' y ');
}

function avisoDelEfectivo(entrada: EntradaDeBancarizacion, sumaDelMesCentavos: number): string | null {
  const conEfecto = entrada.efectivoDelMes.filter(({ efecto }) => efecto.iva || efecto.isr);
  if (conEfecto.length === 0) return null;
  const recibos = conEfecto.map(({ numero }) => numero).join(', ');
  const pierde = lo(unirEfectos(conEfecto.map(({ efecto }) => efecto)));
  return `Con este pago, lo pagado a ${entrada.proveedorNombre} en ${mesLegible(entrada.fecha)} llega a ${quetzales(sumaDelMesCentavos)}: los pagos en efectivo de ese mes (recibos ${recibos}) dejan de respaldar ${pierde} (Decreto 20-2006, art. 20). Consulte a su contador.`;
}

/**
 * Los avisos de bancarización de un pago bancario (cheque, nota de débito o nota ligada), que no bloquean. Se dispara si
 * algún cargo del pago es de {umbral} o más, o si lo pagado al proveedor en el mes, con este pago, llega al umbral. Solo
 * avisa si la empresa pierde algo según su régimen; sin datos fiscales, solo pide completarlos. Si este pago es el que
 * hace llegar el mes al umbral y el mes tiene pagos en efectivo con efecto, avisa que esos pagos dejan de respaldar el
 * costo o el crédito fiscal.
 */
export function avisosDeBancarizacion(entrada: EntradaDeBancarizacion): string[] {
  const { umbralCentavos, efectoDelPago } = entrada;
  const sumaDelMes = entrada.pagadoEnElMesCentavos + entrada.montoDelPagoCentavos;
  const llegaUnCargo = entrada.totalesDeLosCargosCentavos.some((total) => total >= umbralCentavos);
  if (sumaDelMes < umbralCentavos && !llegaUnCargo) return [];
  if (efectoDelPago === null) return [AVISO_DE_DATOS_FISCALES];
  const pierde = efectoDelPago.iva || efectoDelPago.isr;
  return [...(pierde ? [textoDelAviso(umbralCentavos)] : []), ...avisosDelEfectivoSiLlegaElMes(entrada, sumaDelMes)];
}

/** El aviso de los pagos en efectivo, solo si este pago es el que hace llegar el mes al umbral. */
function avisosDelEfectivoSiLlegaElMes(entrada: EntradaDeBancarizacion, sumaDelMesCentavos: number): string[] {
  const hizoLlegarElMes =
    sumaDelMesCentavos >= entrada.umbralCentavos && entrada.pagadoEnElMesCentavos < entrada.umbralCentavos;
  const aviso = hizoLlegarElMes ? avisoDelEfectivo(entrada, sumaDelMesCentavos) : null;
  return aviso === null ? [] : [aviso];
}
