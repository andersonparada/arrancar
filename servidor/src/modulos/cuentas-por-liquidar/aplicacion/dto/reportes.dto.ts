import type { ClaseDeAnticipo, DestinoDeLoNoLiquidado } from '../../dominio/anticipos.js';
import type { TramoDeAntiguedad } from '../../dominio/antiguedad-de-anticipos.js';

/** Un anticipo por liquidar al corte (CL-R1). */
export interface AnticipoPorLiquidarDto {
  id: string;
  numero: string;
  clase: ClaseDeAnticipo;
  fecha: string;
  fechaLimite: string;
  monto: string;
  /** Lo que faltaba por justificar al corte. */
  porJustificar: string;
  diasDesdeLaEntrega: number;
  diasVencido: number;
  vencido: boolean;
  tramo: TramoDeAntiguedad;
}

/** Los anticipos por liquidar de un beneficiario. */
export interface BeneficiarioPorLiquidarDto {
  beneficiarioId: string;
  beneficiario: string;
  esEmpleado: boolean;
  cantidad: number;
  vencidos: number;
  monto: string;
  porJustificar: string;
  anticipos: AnticipoPorLiquidarDto[];
}

export interface TramoDelReporteDto {
  tramo: TramoDeAntiguedad;
  titulo: string;
  cantidad: number;
  porJustificar: string;
}

/** CL-R1: lo que los beneficiarios debían justificar al corte, con su antigüedad. */
export interface ReporteDeAnticiposPorLiquidarDto {
  corte: string;
  beneficiarios: BeneficiarioPorLiquidarDto[];
  porTramo: TramoDelReporteDto[];
  total: {
    beneficiarios: number;
    anticipos: number;
    vencidos: number;
    monto: string;
    porJustificar: string;
    /** Lo por justificar de los anticipos vencidos. */
    porJustificarVencido: string;
  };
  leyendas: string[];
}

/** Un anticipo liquidado con una parte no liquidada (CL-R2). */
export interface FilaDeNoLiquidadoDto {
  id: string;
  numero: string;
  beneficiarioId: string;
  beneficiario: string;
  esEmpleado: boolean;
  fechaDeLiquidacion: string;
  noLiquidado: string;
  cuotas: number | null;
  /** Solo al cobrar en cuotas: el valor de cada cuota, redondeado hacia abajo (la última lleva lo que sobre). */
  valorDeCuota: string | null;
  motivo: string;
}

export interface GrupoDeNoLiquidadoDto {
  destino: DestinoDeLoNoLiquidado;
  titulo: string;
  cantidad: number;
  monto: string;
  filas: FilaDeNoLiquidadoDto[];
}

/** CL-R2: lo no liquidado en un período, por destino. */
export interface ReporteDeNoLiquidadoDto {
  desde: string;
  hasta: string;
  grupos: GrupoDeNoLiquidadoDto[];
  total: { cantidad: number; monto: string };
  leyendas: string[];
}
