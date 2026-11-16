import {
  BeneficiarioDelRetiroInvalido,
  CustodioObligatorio,
  FechaDeRetiroInvalida,
  MontoDeRetiroInvalido,
} from './errores-de-retiros.js';

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
 * A nombre de quién va el cheque del retiro: el que se escribió o, si no se escribió nada, el custodio. Sin beneficiario o
 * «al portador» el cheque se cobraría sin identificarse (Código de Comercio, arts. 497-499).
 * @throws BeneficiarioDelRetiroInvalido
 */
export function beneficiarioDelRetiro(escrito: string | null | undefined, custodio: string): string {
  const beneficiario = (escrito ?? custodio).trim();
  const huella = huellaDelTexto(beneficiario);
  if (huella === '' || huella === 'alportador' || huella === 'portador') throw new BeneficiarioDelRetiroInvalido();
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

/** @throws FechaDeRetiroInvalida si es posterior a hoy: el efectivo no se retira por adelantado. */
export function exigirFechaDeRetiro(fecha: string, hoy: string): void {
  if (fecha > hoy) throw new FechaDeRetiroInvalida();
}

/** @throws MontoDeRetiroInvalido si no es mayor que cero. */
export function exigirMontoDeRetiro(montoCentavos: number): number {
  if (montoCentavos <= 0) throw new MontoDeRetiroInvalido();
  return montoCentavos;
}
