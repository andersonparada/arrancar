import { numeroDelAnticipo, type Anticipo } from './anticipos.js';
import {
  AnticipoCobrado,
  AnticipoConGastos,
  AnticipoLiquidado,
  AnticipoYaAnulado,
  BeneficiarioConVencidos,
  BeneficiarioDelAnticipoInvalido,
  FechaDelAnticipoInvalida,
  FechaLimiteInvalida,
  MontoDelAnticipoInvalido,
  MotivoConVencidosObligatorio,
  MotivoInvalido,
} from './errores-de-anticipos.js';
import { sumarDias } from './fechas.js';

const MAXIMO_DEL_MOTIVO = 300;

const numeroDe = (anticipo: Pick<Anticipo, 'numero' | 'anioDeNumero'>): string =>
  numeroDelAnticipo(anticipo.numero, anticipo.anioDeNumero);

/** Sin mayúsculas, tildes, espacios ni signos: «Al  Portador.» y «alportador» son lo mismo. */
function huellaDelTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * A nombre de quién va el cheque: el del beneficiario. Un nombre vacío o «al portador» se cobraría sin identificarse
 * (Código de Comercio, arts. 497-499).
 * @throws BeneficiarioDelAnticipoInvalido
 */
export function beneficiarioDelCheque(nombre: string): string {
  const huella = huellaDelTexto(nombre);
  if (huella === '' || huella === 'alportador' || huella === 'portador') throw new BeneficiarioDelAnticipoInvalido();
  return nombre.trim();
}

/** @throws FechaDelAnticipoInvalida si es posterior a hoy: el dinero no se entrega por adelantado. */
export function exigirFechaDelAnticipo(fecha: string, hoy: string): void {
  if (fecha > hoy) throw new FechaDelAnticipoInvalida();
}

/** @throws MontoDelAnticipoInvalido si no es mayor que cero. */
export function exigirMontoDelAnticipo(montoCentavos: number): number {
  if (montoCentavos <= 0) throw new MontoDelAnticipoInvalido();
  return montoCentavos;
}

/**
 * La fecha límite para liquidar: la escrita o, si falta, la entrega más los días de la configuración.
 * @throws FechaLimiteInvalida si es anterior a la entrega.
 */
export function fechaLimiteDelAnticipo(datos: { fecha: string; escrita?: string; dias: number }): string {
  const limite = datos.escrita ?? sumarDias(datos.fecha, datos.dias);
  if (limite < datos.fecha) throw new FechaLimiteInvalida(datos.fecha);
  return limite;
}

/** @throws MotivoInvalido si va vacío o pasa de 300 letras. */
export function motivoValido(motivo: string): string {
  const limpio = motivo.trim();
  if (limpio.length === 0 || limpio.length > MAXIMO_DEL_MOTIVO) throw new MotivoInvalido();
  return limpio;
}

/** Lo necesario para decidir si se entrega a quien tiene anticipos vencidos (CL-r). */
export interface RevisionDeVencidos {
  beneficiario: string;
  /** Los números de los anticipos abiertos del beneficiario con la fecha límite pasada. */
  vencidos: readonly string[];
  bloquear: boolean;
  puedeConVencidos: boolean;
  motivo?: string | null;
}

/**
 * Sin vencidos o sin bloqueo no hay nada que exigir (solo el aviso). Con bloqueo hace falta el permiso de excepción y un
 * motivo, que es lo que se devuelve para guardarlo.
 * @throws BeneficiarioConVencidos, MotivoConVencidosObligatorio
 */
export function motivoConVencidos(revision: RevisionDeVencidos): string | null {
  if (revision.vencidos.length === 0 || !revision.bloquear) return null;
  if (!revision.puedeConVencidos) throw new BeneficiarioConVencidos(revision.beneficiario, revision.vencidos);
  const motivo = revision.motivo?.trim() ?? '';
  if (motivo === '' || motivo.length > MAXIMO_DEL_MOTIVO) throw new MotivoConVencidosObligatorio();
  return motivo;
}

/** Lo que se necesita saber, además del anticipo, para decidir si se anula. */
export interface RevisionDeAnulacion {
  gastosVigentes: number;
  /** El cheque o la nota de la entrega ya está conciliado (el banco lo pagó). */
  conciliado: boolean;
}

/**
 * Un anticipo se anula si está abierto, sin gastos vigentes y su cheque no está cobrado.
 * @throws AnticipoYaAnulado, AnticipoLiquidado, AnticipoConGastos, AnticipoCobrado
 */
export function exigirAnticipoAnulable(anticipo: Anticipo, { gastosVigentes, conciliado }: RevisionDeAnulacion): void {
  if (anticipo.estado === 'anulado') throw new AnticipoYaAnulado(numeroDe(anticipo));
  if (anticipo.estado === 'liquidado') throw new AnticipoLiquidado(numeroDe(anticipo));
  if (gastosVigentes > 0) throw new AnticipoConGastos(numeroDe(anticipo));
  if (conciliado) throw new AnticipoCobrado(numeroDe(anticipo));
}

/** Cómo anuló Bancos el movimiento de la entrega y qué fecha contable resulta. */
export interface DatosDeLaFechaDeAnulacion {
  enBancos: 'sin_inverso' | 'con_inverso';
  /** La fecha del inverso en Bancos; solo con `con_inverso`. */
  fechaDelInverso: string | null;
  /** Hoy en la zona horaria de la empresa. */
  hoy: string;
}

/**
 * La fecha contable de la anulación (como CP5-a): sin inverso la entrega «nunca existió» y vale la suya; con inverso, la del
 * inverso en Bancos; si Bancos no dijo la fecha, hoy (nunca antes de la entrega).
 */
export function fechaDeAnulacionDelAnticipo(
  anticipo: Pick<Anticipo, 'fecha'>,
  datos: DatosDeLaFechaDeAnulacion,
): string {
  if (datos.enBancos === 'sin_inverso') return anticipo.fecha;
  if (datos.fechaDelInverso !== null) return datos.fechaDelInverso;
  return datos.hoy > anticipo.fecha ? datos.hoy : anticipo.fecha;
}
