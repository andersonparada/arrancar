import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { sumarDias } from '../../../dominio/fechas-de-corte.js';
import { ProveedorDelReporteNoExiste } from '../../errores.js';
import { filaDeContrasenaPorPagarDto } from '../../dto/dto-de-reportes-de-proveedor.js';
import type { ReporteDeContrasenasPorPagarDto } from '../../dto/reportes-de-proveedor.dto.js';
import type { ContrasenaPorPagar } from '../../puertos/puertos-de-reportes-de-proveedor.js';
import type { DependenciasDeReportesDeProveedor } from './reporte-de-estado-de-cuenta.js';

/** Los filtros de R5. */
export interface SolicitudDeContrasenasPorPagar {
  /** Por omisión, ayer: las que ya vencieron. Con una fecha futura sirve como «por pagar esta semana». */
  pagoPrometidoHasta?: string;
  proveedorId?: string;
}

const suma = (contrasenas: readonly ContrasenaPorPagar[], campo: keyof ContrasenaPorPagar): number =>
  contrasenas.reduce((total, contrasena) => total + Number(contrasena[campo]), 0);

/** Las sumas de las contraseñas del reporte. */
function totalesDe(filas: readonly ContrasenaPorPagar[]): ReporteDeContrasenasPorPagarDto['totales'] {
  return {
    cantidad: filas.length,
    saldo: deCentavos(suma(filas, 'saldoCentavos')),
    autorizado: deCentavos(suma(filas, 'autorizadoCentavos')),
    sinAutorizar: deCentavos(suma(filas, 'sinAutorizarCentavos')),
  };
}

/**
 * R5: las contraseñas vigentes con saldo y su pago prometido (por omisión, las vencidas). Es de hoy: no tiene corte. El
 * saldo es el de sus cargos con el mismo cálculo de los reportes de saldos.
 */
export class ReporteDeContrasenasPorPagar {
  constructor(private readonly dependencias: DependenciasDeReportesDeProveedor) {}

  ejecutar(operador: Operador, solicitud: SolicitudDeContrasenasPorPagar): Promise<ReporteDeContrasenasPorPagarDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const { reloj, consultasDeProveedor } = this.dependencias;
      const hoy = await reloj.hoy(operador);
      await this.exigirProveedor(solicitud.proveedorId);
      const pagoPrometidoHasta = solicitud.pagoPrometidoHasta ?? sumarDias(hoy, -1);
      const { fechaDeInicio } = await this.dependencias.cargaInicial.obtener(operador);
      const filas = await consultasDeProveedor.contrasenasPorPagar({
        empresaId: operador.empresaId,
        hoy,
        fechaDeInicio,
        proveedorId: solicitud.proveedorId,
        pagoPrometidoHasta,
      });
      return {
        hoy,
        pagoPrometidoHasta,
        filas: filas.map((fila) => filaDeContrasenaPorPagarDto(fila, hoy)),
        totales: totalesDe(filas),
      };
    });
  }

  private async exigirProveedor(proveedorId: string | undefined): Promise<void> {
    if (proveedorId && !(await this.dependencias.consultasDeProveedor.datosDelProveedor(proveedorId))) {
      throw new ProveedorDelReporteNoExiste();
    }
  }
}
