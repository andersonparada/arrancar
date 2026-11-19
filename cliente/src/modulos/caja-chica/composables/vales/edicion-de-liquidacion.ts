import type { ComprobanteDeLaBandeja } from '../../servicios/tipos-de-comprobantes';
import type { LiquidacionSolicitada } from '../../servicios/tipos-de-vales';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { cuerpoDeAsignacion, type EdicionDeAsignacion } from '../comprobantes/armado-de-asignacion';
import { cuerpoDeVale, type EdicionDeVale } from '../comprobantes/edicion-de-vale';
import { centavosConSigno, centavosDe, textoConSigno } from '../dinero';

/** Cómo queda el vale con lo elegido: lo gastado y lo que regresaría al fondo. El servidor lo calcula al liquidar. */
export interface CuadroDeLaLiquidacion {
  documentos: number;
  gastosSinFactura: number;
  gastado: string;
  /** `max(0, monto − gastado)`, como lo define el diseño; si se gastó de más, la diferencia salió del fondo. */
  devuelto: string;
  /** Lo que se gastó de más y salió del fondo; `0.00` si no se pasó. */
  deMas: string;
}

const centavosDelDocumento = (documento: ComprobanteDeLaBandeja): number =>
  (documento.resta ? -1 : 1) * (centavosDe(documento.monto) ?? 0);

export function cuadroDeLaLiquidacion(
  vale: { monto: string },
  elegidos: { documentos: readonly ComprobanteDeLaBandeja[]; gastos: readonly EdicionDeVale[] },
): CuadroDeLaLiquidacion {
  const deDocumentos = elegidos.documentos.reduce((suma, documento) => suma + centavosDelDocumento(documento), 0);
  const deGastos = elegidos.gastos.reduce((suma, gasto) => suma + (centavosDe(String(gasto.monto ?? '')) ?? 0), 0);
  const gastado = deDocumentos + deGastos;
  const diferencia = (centavosConSigno(vale.monto) ?? 0) - gastado;
  return {
    documentos: elegidos.documentos.length,
    gastosSinFactura: elegidos.gastos.length,
    gastado: textoConSigno(gastado),
    devuelto: textoConSigno(Math.max(0, diferencia)),
    deMas: textoConSigno(Math.max(0, -diferencia)),
  };
}

/** El cuerpo de liquidar: los documentos de la bandeja con sus motivos y los gastos sin factura. */
export function cuerpoDeLaLiquidacion(
  elegidos: { documentos: readonly ComprobanteDeLaBandeja[]; gastos: readonly EdicionDeVale[] },
  edicion: EdicionDeAsignacion,
): LiquidacionSolicitada {
  return {
    ...(edicion.fecha.trim() ? { fecha: edicion.fecha.trim() } : {}),
    documentos: cuerpoDeAsignacion(elegidos.documentos, edicion),
    valesDeGasto: elegidos.gastos.map(cuerpoDeVale),
  };
}

/** Lo que se le dice al usuario antes de liquidar, para que confirme sabiendo qué va a pasar. */
export function resumenDeLaConfirmacion(
  vale: { numero: number; monto: string },
  cuadro: CuadroDeLaLiquidacion,
): string {
  const plural = (cantidad: number, uno: string, varios: string): string =>
    `${cantidad} ${cantidad === 1 ? uno : varios}`;
  const partes = [
    cuadro.documentos > 0 ? plural(cuadro.documentos, 'documento', 'documentos') : null,
    cuadro.gastosSinFactura > 0 ? plural(cuadro.gastosSinFactura, 'gasto sin factura', 'gastos sin factura') : null,
  ].filter((parte) => parte !== null);
  const con = partes.length > 0 ? partes.join(' y ') : 'ningún comprobante';
  return `Va a liquidar el vale ${vale.numero} con ${con}. Se gastaron ${formatearMonto(cuadro.gastado)} de ${formatearMonto(vale.monto)}.`;
}
