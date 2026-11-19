import {
  FechaDelValeInvalida,
  NotasDeCreditoSinGasto,
  ReceptorDelValeObligatorio,
  ValeConComprobantes,
  ValeMayorQueElEfectivo,
  ValeNoEstaAbierto,
} from './errores-de-vales-provisionales.js';
import { diasEntre } from './reglas-de-arqueos.js';
import type { ValeProvisional } from './vales-provisionales.js';

const MAXIMO_DEL_RECEPTOR = 150;

/** Quién recibe el efectivo: el nombre del usuario escogido o, sin usuario, el que se escribió. */
export function nombreDelReceptor(escrito: string | null | undefined, nombreDelUsuario: string | null): string {
  const nombre = (nombreDelUsuario ?? escrito ?? '').trim().slice(0, MAXIMO_DEL_RECEPTOR).trim();
  if (nombre === '') throw new ReceptorDelValeObligatorio();
  return nombre;
}

/** @throws FechaDelValeInvalida si es futura o anterior a la apertura del fondo. */
export function exigirFechaDelVale(fecha: string, contexto: { hoy: string; fechaDeApertura: string }): void {
  if (fecha > contexto.hoy) throw new FechaDelValeInvalida('La fecha del vale no puede ser futura.');
  if (fecha < contexto.fechaDeApertura) {
    throw new FechaDelValeInvalida('La fecha del vale no puede ser anterior a la apertura del fondo.');
  }
}

/** @throws FechaDelValeInvalida si la liquidación es futura o anterior a la entrega del vale. */
export function exigirFechaDeLiquidacion(
  fecha: string,
  contexto: { hoy: string; vale: Pick<ValeProvisional, 'fecha'> },
): void {
  if (fecha > contexto.hoy) throw new FechaDelValeInvalida('La fecha de la liquidación no puede ser futura.');
  if (fecha < contexto.vale.fecha) {
    throw new FechaDelValeInvalida('La fecha de la liquidación no puede ser anterior a la entrega del vale.');
  }
}

/** @throws ValeMayorQueElEfectivo si lo que se entrega pasa del efectivo esperado en la caja. */
export function exigirQueAlcanceParaElVale(esperadoCentavos: number, montoCentavos: number): void {
  if (montoCentavos > esperadoCentavos) throw new ValeMayorQueElEfectivo(esperadoCentavos, montoCentavos);
}

/** @throws ValeNoEstaAbierto */
export function exigirValeAbierto(vale: Pick<ValeProvisional, 'estado' | 'numero'>): void {
  if (vale.estado !== 'abierto') throw new ValeNoEstaAbierto(vale.numero, vale.estado);
}

/** @throws ValeNoEstaAbierto, ValeConComprobantes */
export function exigirValeAnulable(vale: Pick<ValeProvisional, 'estado' | 'numero'>, comprobantes: number): void {
  exigirValeAbierto(vale);
  if (comprobantes > 0) throw new ValeConComprobantes(vale.numero);
}

/** @throws NotasDeCreditoSinGasto si lo gastado queda negativo (una nota sin la factura que compensa en el mismo vale). */
export function exigirGastoNoNegativo(gastadoCentavos: number): void {
  if (gastadoCentavos < 0) throw new NotasDeCreditoSinGasto(gastadoCentavos);
}

/**
 * Lo que regresa al fondo: lo que sobró del vale. Si se gastó de más, la diferencia salió de la caja y no regresa nada
 * (la ecuación del fondo sigue cuadrando).
 */
export const devueltoDelVale = (montoCentavos: number, gastadoCentavos: number): number =>
  Math.max(0, montoCentavos - gastadoCentavos);

/** Cuántos días lleva abierto el vale (0 si ya no está abierto). */
export const diasAbiertoDelVale = (vale: Pick<ValeProvisional, 'fecha' | 'estado'>, hoy: string): number =>
  vale.estado === 'abierto' ? Math.max(0, diasEntre(vale.fecha, hoy)) : 0;

/** El aviso «vale viejo»: un vale abierto lleva más de `diasParaAvisar` días sin liquidarse. Con 0 no se avisa. */
export function avisoDeValeViejo(por: {
  numero?: number;
  fecha: string;
  hoy: string;
  diasParaAvisar: number;
}): string | null {
  const { numero, fecha, hoy, diasParaAvisar } = por;
  const dias = diasEntre(fecha, hoy);
  if (diasParaAvisar === 0 || dias <= diasParaAvisar) return null;
  return numero === undefined
    ? `Hay un vale provisional abierto desde hace ${dias} días: liquídelo.`
    : `El vale ${numero} lleva ${dias} días abierto: liquídelo.`;
}
