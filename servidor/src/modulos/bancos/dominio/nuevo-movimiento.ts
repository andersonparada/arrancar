import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { aCentavos } from './centavos.js';
import { MontoInvalido, MotivoDeAnulacionInvalido } from './errores.js';
import { AbonoEnCuentaSoloEnCheque } from './errores-de-impresion.js';
import type { DatosDeIntereses } from './intereses.js';
import type { OrigenDeMovimiento } from './origen-de-movimiento.js';
import type { ParteDeApertura } from './partes-de-apertura.js';
import type { DatosDeMovimiento, PropiedadesDeMovimiento } from './propiedades-de-movimiento.js';

/** Los vínculos que no llegan del usuario: los pone quien arma el movimiento. */
export interface VinculosDeUnMovimiento {
  transferenciaId?: string | null;
  revierteAId?: string | null;
  origen?: OrigenDeMovimiento;
  /** La parte de la apertura que es y la cabecera de la que cuelga (solo los saldos iniciales). */
  apertura?: { parte: ParteDeApertura; saldoInicialId: string };
  /** Solo un cheque puede llevarla (la casilla «Para abono en cuenta» de quien lo emite); por omisión, no. */
  paraAbonoEnCuenta?: boolean;
}

/** @throws AbonoEnCuentaSoloEnCheque si pide «para abono en cuenta» sin ser un cheque. */
export function exigirAbonoEnCuentaSoloEnCheque(tipo: DatosDeMovimiento['tipo'], paraAbonoEnCuenta: boolean): boolean {
  if (paraAbonoEnCuenta && tipo !== 'cheque') throw new AbonoEnCuentaSoloEnCheque();
  return paraAbonoEnCuenta;
}

/** @throws MontoInvalido si el monto no es mayor que cero. */
export function datosValidos(datos: DatosDeMovimiento): DatosDeMovimiento & Required<DatosDeIntereses> {
  if (aCentavos(datos.monto) <= 0) throw new MontoInvalido();
  return { ...datos, interesBruto: datos.interesBruto ?? null, isrRetenido: datos.isrRetenido ?? null };
}

const MAXIMO_DEL_MOTIVO = 500;

/**
 * El motivo de una anulación, reversión o baja: entre 1 y 500 caracteres, sin espacios a los lados.
 * @throws MotivoDeAnulacionInvalido
 */
export function motivoValido(motivo: string): string {
  const limpio = motivo.trim();
  if (!limpio || limpio.length > MAXIMO_DEL_MOTIVO) throw new MotivoDeAnulacionInvalido();
  return limpio;
}

const origenDe = ({ origen }: VinculosDeUnMovimiento) =>
  origen
    ? { moduloDeOrigen: origen.modulo, documentoDeOrigenId: origen.documentoId }
    : { moduloDeOrigen: null, documentoDeOrigenId: null };

const aperturaDe = ({ apertura }: VinculosDeUnMovimiento) =>
  apertura
    ? { parteDeApertura: apertura.parte, saldoInicialId: apertura.saldoInicialId }
    : { parteDeApertura: null, saldoInicialId: null };

/** Las propiedades de un movimiento recién creado: vigente, sin número, sin reversión y con los vínculos que se le den. */
export function propiedadesDeUnMovimientoNuevo(
  empresaId: Identificador<'Empresa'>,
  datos: DatosDeMovimiento,
  vinculos: VinculosDeUnMovimiento,
): PropiedadesDeMovimiento {
  return {
    ...datosValidos(datos),
    empresaId,
    id: Identificador.nuevo(),
    anuladoEn: null,
    motivoDeAnulacion: null,
    transferenciaId: vinculos.transferenciaId ?? null,
    revertidoEn: null,
    motivoDeReversion: null,
    revierteAId: vinculos.revierteAId ?? null,
    numero: null,
    anioDeNumero: 0,
    ...origenDe(vinculos),
    ...aperturaDe(vinculos),
    paraAbonoEnCuenta: exigirAbonoEnCuentaSoloEnCheque(datos.tipo, vinculos.paraAbonoEnCuenta ?? false),
  };
}

/** Lo que el usuario puede escribir de un movimiento, tal como está hoy. */
export function datosDeLasPropiedades(propiedades: PropiedadesDeMovimiento): DatosDeMovimiento {
  const { cuentaBancariaId, tipo, fecha, monto, saldoInicial, referencia, beneficiario, observaciones } = propiedades;
  const { conceptoId, interesBruto, isrRetenido } = propiedades;
  return {
    cuentaBancariaId,
    tipo,
    fecha,
    monto,
    saldoInicial,
    referencia,
    beneficiario,
    observaciones,
    conceptoId,
    interesBruto,
    isrRetenido,
  };
}
