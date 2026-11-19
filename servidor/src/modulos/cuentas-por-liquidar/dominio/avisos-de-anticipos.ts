import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import { numeroDelAnticipo, type Anticipo } from './anticipos.js';
import { fechaLegible } from './fechas.js';

/** Centavos como quetzales para un mensaje: `120000` → `Q1,200.00`. */
export function quetzales(centavos: number): string {
  const [enteros = '0', decimales = '00'] = deCentavos(centavos).split('.');
  return `Q${enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimales}`;
}

/** C8: a un beneficiario que no es empleado las facturas deben salirle a nombre de la empresa, o no sirven al gasto. */
export const AVISO_DE_FACTURAS_A_NOMBRE_DE_LA_EMPRESA = 'Las facturas deben venir a nombre y NIT de la empresa.';

/** El aviso al entregar a quien ya tiene anticipos vencidos sin liquidar (con el bloqueo apagado o con la excepción). */
export function avisoDeBeneficiarioConVencidos(beneficiario: string, vencidos: readonly string[]): string {
  const vencido = vencidos.length === 1 ? 'vencido el anticipo' : 'vencidos los anticipos';
  return `${beneficiario} tiene ${vencido} ${vencidos.join(', ')} sin liquidar.`;
}

/** El aviso fijo de un anticipo abierto que pasó su fecha límite, en la lista y en la ficha. */
export function avisoDeAnticipoVencido(
  anticipo: Pick<Anticipo, 'numero' | 'anioDeNumero' | 'fechaLimite' | 'beneficiario'>,
  porJustificarCentavos: number,
): string {
  const numero = numeroDelAnticipo(anticipo.numero, anticipo.anioDeNumero);
  return `El anticipo ${numero} venció el ${fechaLegible(anticipo.fechaLimite)} y ${anticipo.beneficiario} aún tiene ${quetzales(porJustificarCentavos)} por justificar.`;
}
