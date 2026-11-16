import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { tituloDeDocumento } from '../detalles-de-documento';
import type { EstadoDePago, FilaDeDocumentoAlCorte } from '../../servicios/tipos-de-reportes';
import { TEXTOS_DE_TRAMO } from './vistas-de-documentos';

type Tono = 'campo' | 'trigo' | 'tierra' | 'rojo';

const TONOS_DE_PAGO: Record<EstadoDePago, Tono> = {
  pagado: 'campo',
  en_parte: 'trigo',
  comprometido: 'tierra',
  pendiente: 'tierra',
};

export const tonoDeEstadoDePago = (estado: EstadoDePago): Tono => TONOS_DE_PAGO[estado];

export const tituloDeLaFila = (fila: FilaDeDocumentoAlCorte): string => tituloDeDocumento(fila);

/** «Vence 12/10/2026 · 5 días vencido»; sin vencimiento lo dice, y un cargo que aún no vence no cuenta días. */
export function textoDeVencimiento(fila: FilaDeDocumentoAlCorte): string {
  if (!fila.vencimiento) return 'Sin vencimiento';
  const fecha = `Vence ${formatearFecha(fila.vencimiento)}`;
  const dias = fila.diasVencido ?? 0;
  if (dias <= 0) return fecha;
  return `${fecha} · ${dias} ${dias === 1 ? 'día vencido' : 'días vencido'}`;
}

export const estaVencida = (fila: FilaDeDocumentoAlCorte): boolean =>
  (fila.diasVencido ?? 0) > 0 && Number(fila.saldo) > 0;

export const textoDeTramo = (fila: FilaDeDocumentoAlCorte): string => TEXTOS_DE_TRAMO[fila.tramo] ?? fila.tramo;

/** La contraseña de pago vigente con su fecha prometida, o `null`. */
export const textoDeContrasena = (fila: FilaDeDocumentoAlCorte): string | null =>
  fila.contrasena
    ? `N.º ${fila.contrasena.numero}, pago prometido ${formatearFecha(fila.contrasena.pagoPrometido)}`
    : null;

/** Las notas de la fila que explican su saldo (solo las que aplican): saldo inicial y retenciones por practicar. */
export function notasDeLaFila(fila: FilaDeDocumentoAlCorte, dar: (monto: string) => string): string[] {
  const notas: string[] = [];
  if (fila.anterioresAlInicio !== null)
    notas.push(`Pagos y notas anteriores a la fecha de inicio: ${dar(fila.anterioresAlInicio)}`);
  if (fila.retencionesPorPracticar !== null && Number(fila.retencionesPorPracticar) > 0) {
    notas.push(`Retenciones por practicar: ${dar(fila.retencionesPorPracticar)}`);
  }
  return notas;
}
