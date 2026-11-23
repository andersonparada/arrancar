import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { Anticipo } from '../../servicios/tipos-de-anticipos';
import { textoDelDestino } from '../anticipos/ficha-de-anticipo';
import { cuadreDeLaLiquidacion, type EdicionDeLiquidacion } from './edicion-de-liquidacion';

/** Los nombres que el resumen necesita y solo el formulario conoce. */
export interface NombresDeLaLiquidacion {
  cuentaDelDeposito: string;
  medioDelReembolso: string;
}

function fraseDeLoNoLiquidado(edicion: EdicionDeLiquidacion): string {
  const monto = formatearMonto(edicion.noLiquidado);
  if (edicion.destino === '') return `${monto} quedan sin liquidar.`;
  const destino = textoDelDestino(edicion.destino, edicion.destino === 'cobrar' ? Number(edicion.cuotas) : null);
  return `${monto} quedan sin liquidar: ${destino.toLowerCase()}. Queda en la auditoría con su motivo.`;
}

function fraseDelReembolso(
  edicion: EdicionDeLiquidacion,
  datos: { monto: string; medio: string; beneficiario: string },
): string {
  const documento = edicion.formaDelReembolso === 'cheque' ? 'un cheque' : 'una nota de débito';
  return `Se gastó de más: Bancos emitirá ${documento} de ${datos.medio} por ${formatearMonto(datos.monto)} para reembolsar a ${datos.beneficiario}.`;
}

/** Qué va a pasar al liquidar, dicho en palabras, para confirmarlo antes de mover dinero. */
export function resumenDeLaLiquidacion(
  edicion: EdicionDeLiquidacion,
  anticipo: Pick<Anticipo, 'numero' | 'monto' | 'gastado' | 'porJustificar' | 'esEmpleado' | 'beneficiario'>,
  nombres: NombresDeLaLiquidacion,
): string {
  const cuadre = cuadreDeLaLiquidacion(edicion, anticipo);
  const partes = [
    `Se liquida el anticipo ${anticipo.numero}: de ${formatearMonto(anticipo.monto)} entregados se justificaron ${formatearMonto(anticipo.gastado)}.`,
  ];
  if (cuadre.reembolsa) {
    const datos = { monto: cuadre.reembolsa, medio: nombres.medioDelReembolso, beneficiario: anticipo.beneficiario };
    partes.push(fraseDelReembolso(edicion, datos));
  }
  if (cuadre.hayDevuelto) {
    partes.push(
      `${anticipo.beneficiario} devuelve ${formatearMonto(edicion.devuelto)}: Bancos los deposita en ${nombres.cuentaDelDeposito}.`,
    );
  }
  if (cuadre.hayNoLiquidado) partes.push(fraseDeLoNoLiquidado(edicion));
  partes.push('Después de liquidar, los gastos ya no se pueden cambiar salvo que reabra el anticipo.');
  return partes.join(' ');
}
