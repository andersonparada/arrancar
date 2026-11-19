export type ClaseDeAnticipo = 'viatico' | 'compra' | 'otro';
export type DestinoDeNoLiquidado = 'cobrar' | 'renta_del_trabajo' | 'perdida';
export type TramoDeAntiguedad = 'al_dia' | 'de_1_a_30' | 'de_31_a_60' | 'de_61_a_90' | 'mas_de_90';

export interface AnticipoPorLiquidar {
  id: string;
  numero: string;
  clase: ClaseDeAnticipo;
  fecha: string;
  fechaLimite: string;
  monto: string;
  porJustificar: string;
  diasDesdeLaEntrega: number;
  diasVencido: number;
  vencido: boolean;
  tramo: TramoDeAntiguedad;
}

export interface BeneficiarioPorLiquidar {
  beneficiarioId: string;
  beneficiario: string;
  esEmpleado: boolean;
  cantidad: number;
  vencidos: number;
  monto: string;
  porJustificar: string;
  anticipos: AnticipoPorLiquidar[];
}

export interface TramoDelReporte {
  tramo: TramoDeAntiguedad;
  titulo: string;
  cantidad: number;
  porJustificar: string;
}

/** CL-R1: lo que los beneficiarios debían justificar al corte. */
export interface ReporteDeAnticiposPorLiquidar {
  corte: string;
  beneficiarios: BeneficiarioPorLiquidar[];
  porTramo: TramoDelReporte[];
  total: {
    beneficiarios: number;
    anticipos: number;
    vencidos: number;
    monto: string;
    porJustificar: string;
    porJustificarVencido: string;
  };
  leyendas: string[];
}

export interface FilaDeNoLiquidado {
  id: string;
  numero: string;
  beneficiarioId: string;
  beneficiario: string;
  esEmpleado: boolean;
  fechaDeLiquidacion: string;
  noLiquidado: string;
  cuotas: number | null;
  valorDeCuota: string | null;
  motivo: string;
}

export interface GrupoDeNoLiquidado {
  destino: DestinoDeNoLiquidado;
  titulo: string;
  cantidad: number;
  monto: string;
  filas: FilaDeNoLiquidado[];
}

/** CL-R2: lo no liquidado en un período, por destino. */
export interface ReporteDeNoLiquidado {
  desde: string;
  hasta: string;
  grupos: GrupoDeNoLiquidado[];
  total: { cantidad: number; monto: string };
  leyendas: string[];
}
