import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type {
  Anticipo,
  DestinoDeNoLiquidado,
  SolicitudDeLiquidacion,
  SolicitudDeReembolso,
} from '../../servicios/tipos-de-anticipos';
import { centavosDe, centavosDelServidor, textoDeCentavos } from '../dinero';
import type { FormaDeMedio } from '../anticipos/opciones-de-medios';

export const MAXIMO_DEL_MOTIVO_DE_NO_LIQUIDADO = 300;
export const MAXIMO_DE_REFERENCIA_DE_LIQUIDACION = 100;
export const MAXIMO_DE_CUOTAS = 120;

/** Lo que se escribe al liquidar. Los montos son texto con dos decimales. */
export interface EdicionDeLiquidacion {
  fecha: string;
  devuelto: string;
  /** La cuenta donde se deposita lo devuelto. */
  cuentaDelDeposito: string;
  /** La boleta del depósito. */
  referencia: string;
  noLiquidado: string;
  destino: DestinoDeNoLiquidado | '';
  cuotas: string;
  pagoVoluntario: boolean;
  motivoDeNoLiquidado: string;
  /** Si se gastó de más: cómo se reembolsa. */
  formaDelReembolso: FormaDeMedio;
  medioDelReembolso: string;
  noNegociable: boolean;
  referenciaDelReembolso: string;
}

type DatosDelAnticipo = Pick<Anticipo, 'porJustificar' | 'esEmpleado'>;

/** Lo que falta por justificar, en centavos (negativo si se gastó de más). */
export const porJustificarEnCentavos = (anticipo: Pick<Anticipo, 'porJustificar'>): number =>
  centavosDelServidor(anticipo.porJustificar);

/** Al abrir: lo que falta se devuelve entero (lo más común) y nada queda sin liquidar. */
export function edicionDeLiquidacionInicial(anticipo: DatosDelAnticipo, hoy: string): EdicionDeLiquidacion {
  const faltan = Math.max(porJustificarEnCentavos(anticipo), 0);
  return {
    fecha: hoy,
    devuelto: textoDeCentavos(faltan),
    cuentaDelDeposito: '',
    referencia: '',
    noLiquidado: '0.00',
    destino: '',
    cuotas: '',
    pagoVoluntario: false,
    motivoDeNoLiquidado: '',
    formaDelReembolso: 'cheque',
    medioDelReembolso: '',
    noNegociable: true,
    referenciaDelReembolso: '',
  };
}

/** El otro monto, para que lo repartido siempre sume lo que falta; si lo escrito no es un monto o se pasa, queda como está. */
function elResto(anticipo: DatosDelAnticipo, escrito: string, actual: string): string {
  const centavos = centavosDe(escrito);
  const faltan = porJustificarEnCentavos(anticipo);
  return centavos === null || centavos > faltan ? actual : textoDeCentavos(faltan - centavos);
}

/** Al escribir lo devuelto, lo no liquidado es el resto de lo que falta. */
export function alEscribirDevuelto(edicion: EdicionDeLiquidacion, anticipo: DatosDelAnticipo, escrito: string): void {
  edicion.noLiquidado = elResto(anticipo, escrito, edicion.noLiquidado);
  edicion.devuelto = escrito;
}

/** Al escribir lo no liquidado, lo devuelto es el resto de lo que falta. */
export function alEscribirNoLiquidado(
  edicion: EdicionDeLiquidacion,
  anticipo: DatosDelAnticipo,
  escrito: string,
): void {
  edicion.devuelto = elResto(anticipo, escrito, edicion.devuelto);
  edicion.noLiquidado = escrito;
}

/** Cómo va el cuadre: si se gastó de más, cuánto se reembolsa; si no, cuánto falta repartir (0 si cuadra). */
export interface Cuadre {
  reembolsa: string | null;
  faltaRepartir: string;
  cuadra: boolean;
  hayDevuelto: boolean;
  hayNoLiquidado: boolean;
}

export function cuadreDeLaLiquidacion(edicion: EdicionDeLiquidacion, anticipo: DatosDelAnticipo): Cuadre {
  const faltan = porJustificarEnCentavos(anticipo);
  const devuelto = centavosDe(edicion.devuelto) ?? 0;
  const noLiquidado = centavosDe(edicion.noLiquidado) ?? 0;
  if (faltan < 0) {
    return {
      reembolsa: textoDeCentavos(-faltan),
      faltaRepartir: '0.00',
      cuadra: true,
      hayDevuelto: false,
      hayNoLiquidado: false,
    };
  }
  const resta = faltan - devuelto - noLiquidado;
  return {
    reembolsa: null,
    faltaRepartir: textoDeCentavos(resta),
    cuadra: resta === 0,
    hayDevuelto: devuelto > 0,
    hayNoLiquidado: noLiquidado > 0,
  };
}

function erroresDeLoNoLiquidado(edicion: EdicionDeLiquidacion): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.destino) errores.destinoDeNoLiquidado = 'Diga qué se hace con lo no liquidado.';
  const cuotas = Number(edicion.cuotas);
  if (edicion.destino === 'cobrar' && !(Number.isInteger(cuotas) && cuotas >= 1)) {
    errores.cuotas = 'Escriba en cuántas cuotas se cobra.';
  }
  if (!edicion.motivoDeNoLiquidado.trim()) errores.motivoDeNoLiquidado = 'Escriba por qué queda algo sin liquidar.';
  return errores;
}

function erroresDeLaFecha(fecha: string, hoy: string): Record<string, string> {
  if (!fecha) return { fecha: 'Escriba la fecha de la liquidación.' };
  return fecha > hoy ? { fecha: 'La liquidación no puede tener fecha futura.' } : {};
}

function erroresDelDinero(edicion: EdicionDeLiquidacion, cuadre: Cuadre): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!cuadre.cuadra) {
    errores.devuelto = `Lo devuelto más lo no liquidado debe sumar lo que falta por justificar; faltan ${cuadre.faltaRepartir} por repartir.`;
  }
  if (cuadre.hayDevuelto && !edicion.cuentaDelDeposito) {
    errores.cuentaBancariaId = 'Escoja la cuenta donde se deposita lo devuelto.';
  }
  if (cuadre.reembolsa && !edicion.medioDelReembolso) errores.medioDelReembolso = 'Escoja con qué se reembolsa.';
  return errores;
}

/** Los errores por campo antes de molestar al servidor (las reglas finas las revisa el servidor). */
export function erroresDeLaLiquidacion(
  edicion: EdicionDeLiquidacion,
  anticipo: DatosDelAnticipo,
  hoy: string,
): Record<string, string> {
  const cuadre = cuadreDeLaLiquidacion(edicion, anticipo);
  return {
    ...erroresDeLaFecha(edicion.fecha, hoy),
    ...erroresDelDinero(edicion, cuadre),
    ...(cuadre.hayNoLiquidado ? erroresDeLoNoLiquidado(edicion) : {}),
  };
}

function reembolsoPedido(edicion: EdicionDeLiquidacion): SolicitudDeReembolso {
  if (edicion.formaDelReembolso === 'cheque') {
    return { forma: 'cheque', chequeraId: edicion.medioDelReembolso, noNegociable: edicion.noNegociable };
  }
  return {
    forma: 'nota_de_debito',
    cuentaBancariaId: edicion.medioDelReembolso,
    referencia: textoONulo(edicion.referenciaDelReembolso),
  };
}

/** Lo del depósito de lo devuelto: la cuenta y la boleta. */
const parteDelDeposito = (edicion: EdicionDeLiquidacion): Partial<SolicitudDeLiquidacion> => ({
  cuentaBancariaId: edicion.cuentaDelDeposito,
  referencia: textoONulo(edicion.referencia),
});

/** Lo de lo no liquidado: destino, cuotas (solo si se cobra), pago voluntario y motivo. */
const parteDeLoNoLiquidado = (edicion: EdicionDeLiquidacion): Partial<SolicitudDeLiquidacion> => ({
  destinoDeNoLiquidado: edicion.destino || null,
  cuotas: edicion.destino === 'cobrar' ? Number(edicion.cuotas) : null,
  pagoVoluntario: edicion.pagoVoluntario,
  motivoDeNoLiquidado: edicion.motivoDeNoLiquidado.trim(),
});

const montoOCero = (monto: string, aplica: boolean): string =>
  aplica ? textoDeCentavos(centavosDe(monto) ?? 0) : '0.00';

/** El cuerpo que recibe el servidor: solo lo que aplica a lo que se hace. */
export function solicitudDeLiquidacion(
  edicion: EdicionDeLiquidacion,
  anticipo: DatosDelAnticipo,
): SolicitudDeLiquidacion {
  const cuadre = cuadreDeLaLiquidacion(edicion, anticipo);
  return {
    fecha: edicion.fecha,
    devuelto: montoOCero(edicion.devuelto, cuadre.hayDevuelto),
    noLiquidado: montoOCero(edicion.noLiquidado, cuadre.hayNoLiquidado),
    ...(cuadre.hayDevuelto ? parteDelDeposito(edicion) : {}),
    ...(cuadre.hayNoLiquidado ? parteDeLoNoLiquidado(edicion) : {}),
    ...(cuadre.reembolsa ? { reembolso: reembolsoPedido(edicion) } : {}),
  };
}
