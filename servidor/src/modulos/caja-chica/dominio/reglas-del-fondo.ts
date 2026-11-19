import {
  AnulacionDejaElFondoSinMonto,
  AperturaYaAnulada,
  BeneficiarioInvalido,
  CustodioObligatorio,
  DisminucionDejaElFondoEnCero,
  DisminucionMayorQueElEfectivo,
  FechaAnteriorALaApertura,
  FechaDelFondoInvalida,
  FondoConMovimientos,
  FondoNoDisponible,
  MontoDelFondoInvalido,
  NombreDelFondoInvalido,
  TopeDelFondoInvalido,
} from './errores-de-fondos.js';
import type { Fondo, UsoDelFondo } from './fondos.js';

const MAXIMO_DEL_NOMBRE = 80;
const MAXIMO_DEL_CUSTODIO = 150;

/** Sin mayúsculas, tildes, espacios ni signos: «Al  Portador.» y «alportador» son lo mismo. */
function huellaDelTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * A nombre de quién va el cheque: el que se escribió o, si no, el custodio. Sin beneficiario o «al portador» el cheque se
 * cobraría sin identificarse (Código de Comercio, arts. 497-499).
 * @throws BeneficiarioInvalido
 */
export function beneficiarioDelFondo(escrito: string | null | undefined, custodio: string): string {
  const beneficiario = (escrito ?? custodio).trim();
  const huella = huellaDelTexto(beneficiario);
  if (huella === '' || huella === 'alportador' || huella === 'portador') throw new BeneficiarioInvalido();
  return beneficiario;
}

/**
 * Quién lleva el efectivo: el nombre del usuario escogido o el texto escrito (de 1 a 150 letras).
 * @throws CustodioObligatorio
 */
export function nombreDelCustodio(escrito: string | null | undefined, nombreDelUsuario: string | null): string {
  const nombre = (nombreDelUsuario ?? escrito ?? '').trim().slice(0, MAXIMO_DEL_CUSTODIO).trim();
  if (nombre === '') throw new CustodioObligatorio();
  return nombre;
}

/** @throws NombreDelFondoInvalido */
export function exigirNombreDelFondo(nombre: string): string {
  const limpio = nombre.trim();
  if (limpio === '' || limpio.length > MAXIMO_DEL_NOMBRE) throw new NombreDelFondoInvalido();
  return limpio;
}

/** @throws TopeDelFondoInvalido si hay tope y no es mayor que cero. */
export function exigirTope(centavos: number | null): number | null {
  if (centavos !== null && centavos <= 0) throw new TopeDelFondoInvalido();
  return centavos;
}

/** @throws FechaDelFondoInvalida si es posterior a hoy. */
export function exigirFechaNoFutura(fecha: string, hoy: string): void {
  if (fecha > hoy) throw new FechaDelFondoInvalida();
}

/** @throws FechaAnteriorALaApertura si el cambio de monto es anterior a la apertura del fondo. */
export function exigirFechaDesdeLaApertura(fecha: string, fondo: Pick<Fondo, 'fechaDeApertura'>): void {
  if (fecha < fondo.fechaDeApertura) throw new FechaAnteriorALaApertura(fondo.fechaDeApertura);
}

/**
 * Anular un aumento: el fondo y su efectivo esperado deben quedar con algo.
 * @throws AnulacionDejaElFondoSinMonto
 */
export function exigirAnulacionDeAumentoPosible(quedan: { montoCentavos: number; esperadoCentavos: number }): void {
  if (quedan.montoCentavos <= 0 || quedan.esperadoCentavos <= 0) throw new AnulacionDejaElFondoSinMonto();
}

/** @throws MontoDelFondoInvalido si no es mayor que cero. */
export function exigirMontoPositivo(centavos: number): number {
  if (centavos <= 0) throw new MontoDelFondoInvalido();
  return centavos;
}

/** @throws FondoNoDisponible si el fondo ya está cerrado. */
export function exigirFondoAbierto(fondo: Pick<Fondo, 'estado'>): void {
  if (fondo.estado === 'cerrado') throw new FondoNoDisponible();
}

/** Lo que se quiere devolver, lo que debe haber en la caja y lo que vale el fondo. */
export interface DatosDeLaDisminucion {
  montoCentavos: number;
  esperadoCentavos: number;
  fondoCentavos: number;
}

/**
 * Disminuir: se devuelve efectivo que está en la caja (no lo pendiente de reponer ni lo prestado en vales) y el fondo
 * queda con algo.
 * @throws DisminucionMayorQueElEfectivo, DisminucionDejaElFondoEnCero
 */
export function exigirDisminucionPosible(datos: DatosDeLaDisminucion): void {
  if (datos.montoCentavos > datos.esperadoCentavos) throw new DisminucionMayorQueElEfectivo(datos.esperadoCentavos);
  if (datos.montoCentavos >= datos.fondoCentavos) throw new DisminucionDejaElFondoEnCero();
}

const plural = (cantidad: number, uno: string, varios: string) => `${cantidad} ${cantidad === 1 ? uno : varios}`;

/** Lo que ya tiene el fondo, dicho para el mensaje; nada si no tiene nada. */
export function descripcionDelUso({ comprobantes, arqueos, reposiciones, vales }: UsoDelFondo): string | null {
  const partes = [
    comprobantes > 0 ? plural(comprobantes, 'comprobante', 'comprobantes') : null,
    arqueos > 0 ? plural(arqueos, 'arqueo', 'arqueos') : null,
    reposiciones > 0 ? plural(reposiciones, 'reposición', 'reposiciones') : null,
    vales > 0 ? plural(vales, 'vale', 'vales') : null,
  ].filter((parte) => parte !== null);
  return partes.length === 0 ? null : partes.join(', ');
}

/**
 * Anular la apertura (o un aumento por aviso de Bancos): solo si el fondo no se ha usado.
 * @throws FondoConMovimientos
 */
export function exigirFondoSinUso(uso: UsoDelFondo, otrosCambios = 0): void {
  const detalle = descripcionDelUso(uso);
  if (detalle !== null) throw new FondoConMovimientos(detalle);
  if (otrosCambios > 0) throw new FondoConMovimientos(plural(otrosCambios, 'cambio de monto', 'cambios de monto'));
}

/** @throws AperturaYaAnulada */
export function exigirAperturaVigente(apertura: { estado: 'vigente' | 'anulado' } | undefined): void {
  if (apertura === undefined || apertura.estado === 'anulado') throw new AperturaYaAnulada();
}

/** Datos del cambio que se anula, para fechar la anulación. */
export interface DatosDeLaFechaDeAnulacion {
  fecha: string;
  enBancos: 'sin_inverso' | 'con_inverso' | null;
  fechaDelInverso: string | null;
  hoy: string;
}

/**
 * La fecha contable de anular un cambio: sin inverso «nunca existió» y vale la suya; con inverso, la del inverso; sin
 * movimiento en Bancos, hoy (nunca antes de la fecha del cambio).
 */
export function fechaDeAnulacionDelCambio(datos: DatosDeLaFechaDeAnulacion): string {
  const { fecha, enBancos, fechaDelInverso, hoy } = datos;
  if (enBancos === 'sin_inverso') return fecha;
  if (enBancos === 'con_inverso' && fechaDelInverso !== null) return fechaDelInverso;
  return hoy > fecha ? hoy : fecha;
}
