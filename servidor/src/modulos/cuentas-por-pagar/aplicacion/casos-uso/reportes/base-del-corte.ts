import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { CorteAnteriorAlInicio } from '../../../dominio/errores-de-reportes.js';
import { sumarDias } from '../../../dominio/fechas-de-corte.js';
import { ProveedorDelReporteNoExiste } from '../../errores.js';
import type {
  BaseDelCorte,
  ConsultasDeSaldosAlCorte,
  FiltroDeAutorizacion,
} from '../../puertos/puertos-de-saldos-al-corte.js';
import type { CargaInicial } from '../../puertos/puertos-de-saldos-iniciales.js';

/** Lo que necesitan los reportes de saldos a una fecha de corte. */
export interface DependenciasDeReportesDeSaldos {
  unidadDeTrabajo: UnidadDeTrabajo;
  reloj: Reloj;
  cargaInicial: CargaInicial;
  consultas: ConsultasDeSaldosAlCorte;
}

/** Lo que el usuario fija de un corte: el día (hoy si falta), un proveedor y qué autorización entra. */
export interface SolicitudDeCorte {
  corte?: string;
  proveedorId?: string;
  autorizacion: FiltroDeAutorizacion;
}

/**
 * Fija el corte de un reporte: hoy si no se pidió otro, nunca antes del día anterior a la fecha de inicio (antes no hay
 * datos completos) y, si se pidió un proveedor, que exista. Va dentro de la unidad de trabajo del reporte.
 * @throws CorteAnteriorAlInicio si el corte es anterior al mínimo.
 * @throws ProveedorDelReporteNoExiste si el proveedor no existe en la cuenta.
 */
export async function baseDelCorte(
  dependencias: Omit<DependenciasDeReportesDeSaldos, 'unidadDeTrabajo'>,
  operador: Operador,
  solicitud: SolicitudDeCorte,
): Promise<BaseDelCorte> {
  const { reloj, cargaInicial, consultas } = dependencias;
  const { fechaDeInicio } = await cargaInicial.obtener(operador);
  const corte = solicitud.corte ?? (await reloj.hoy(operador));
  const minimo = fechaDeInicio === null ? null : sumarDias(fechaDeInicio, -1);
  if (minimo !== null && corte < minimo) throw new CorteAnteriorAlInicio(minimo);
  if (solicitud.proveedorId && !(await consultas.proveedorExiste(solicitud.proveedorId))) {
    throw new ProveedorDelReporteNoExiste();
  }
  return {
    empresaId: operador.empresaId,
    corte,
    fechaDeInicio,
    proveedorId: solicitud.proveedorId,
    autorizacion: solicitud.autorizacion,
  };
}
