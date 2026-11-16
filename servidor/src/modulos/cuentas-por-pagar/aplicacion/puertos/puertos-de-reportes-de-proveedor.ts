import type { MovimientoDelProveedor, RetencionDelDocumento } from '../../dominio/estado-de-cuenta.js';
import type { NotaAlCorte } from '../../dominio/saldos-a-favor.js';
import type { BaseDelCorte } from './puertos-de-saldos-al-corte.js';

/** Qué hechos de un proveedor se piden para su estado de cuenta: el rango y la fecha de inicio de la empresa. */
export interface RangoDelEstado {
  empresaId: string;
  proveedorId: string;
  /** `AAAA-MM-DD`, inclusive. */
  desde: string;
  hasta: string;
  fechaDeInicio: string | null;
}

/** Las notas con saldo libre al corte (R4); `incluirSinSaldo` trae también las de saldo cero. */
export interface FiltroDeSaldosAFavor extends BaseDelCorte {
  incluirSinSaldo: boolean;
}

/** Los datos de una contraseña vigente con saldo (R5), todo en centavos. */
export interface ContrasenaPorPagar {
  id: string;
  /** El número como se lee (`15` o `2026-15`). */
  numero: string;
  proveedorId: string;
  proveedorNombre: string;
  fecha: string;
  pagoPrometido: string;
  /** El vencimiento más antiguo de sus documentos con saldo. */
  vence: string | null;
  documentosConSaldo: number;
  saldoCentavos: number;
  autorizadoCentavos: number;
  sinAutorizarCentavos: number;
  comprometidoCentavos: number;
  impresa: boolean;
}

export interface FiltroDeContrasenasPorPagar {
  empresaId: string;
  /** El día de hoy: el reporte es operativo, sin corte. */
  hoy: string;
  fechaDeInicio: string | null;
  proveedorId?: string;
  /** Solo las contraseñas cuyo pago prometido es hasta este día. */
  pagoPrometidoHasta: string;
}

/** Las consultas de los reportes de un proveedor y de sus contraseñas y saldos a favor (R3, R4 y R5). */
export interface ConsultasDeReportesDeProveedor {
  /** El nombre y el NIT de un proveedor de la cuenta; `null` si no existe. */
  datosDelProveedor(proveedorId: string): Promise<{ nombre: string; nit: string | null } | null>;
  /** Los hechos del rango (con cada anulación en su fecha contable); los anulados dentro del rango van marcados. */
  movimientosDelProveedor(rango: RangoDelEstado): Promise<MovimientoDelProveedor[]>;
  /** Las retenciones que Libro de compras fijó a los documentos del proveedor. */
  retencionesDelProveedor(empresaId: string, proveedorId: string): Promise<RetencionDelDocumento[]>;
  notasConSaldoAlCorte(filtro: FiltroDeSaldosAFavor): Promise<NotaAlCorte[]>;
  contrasenasPorPagar(filtro: FiltroDeContrasenasPorPagar): Promise<ContrasenaPorPagar[]>;
}
