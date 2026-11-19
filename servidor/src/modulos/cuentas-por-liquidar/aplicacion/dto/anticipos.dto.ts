import type {
  ClaseDeAnticipo,
  DestinoDeLoNoLiquidado,
  EstadoDeAnticipo,
  FormaDeAnticipo,
} from '../../dominio/anticipos.js';

/** El cheque o la nota que Bancos creó para el anticipo. `numero` es el del cheque o el de la nota. */
export interface MovimientoDelAnticipoDto {
  id: string;
  cuentaBancariaId: string;
  numero: number;
}

/** Una fila de la lista de anticipos (dinero como texto con dos decimales). */
export interface AnticipoResumenDto {
  id: string;
  numero: string;
  beneficiarioId: string;
  beneficiario: string;
  esEmpleado: boolean;
  clase: ClaseDeAnticipo;
  forma: FormaDeAnticipo;
  /** El número del cheque o el de la nota de Bancos. */
  documento: number;
  cuentaBancariaId: string;
  fecha: string;
  fechaLimite: string;
  monto: string;
  gastado: string;
  /** Al corte si se pidió; si no, lo que falta hoy. Negativo si se gastó de más. */
  porJustificar: string;
  estado: EstadoDeAnticipo;
  /** Los días desde la entrega, al corte o a hoy. */
  diasDesdeLaEntrega: number;
  /** Los días que pasaron de la fecha límite (0 si no ha vencido). */
  diasVencido: number;
  vencido: boolean;
  /** El aviso fijo de los vencidos. */
  aviso: string | null;
}

export interface PaginaDeAnticiposDto {
  elementos: AnticipoResumenDto[];
  total: number;
  /** La suma de lo que falta por justificar de todo lo filtrado. */
  totalPorJustificar: string;
}

/** Lo que dejó la liquidación (solo con el anticipo liquidado). */
export interface LiquidacionDelAnticipoDto {
  fecha: string;
  devuelto: string;
  movimientoDeDevolucionId: string | null;
  reembolsado: string;
  movimientoDeReembolsoId: string | null;
  noLiquidado: string;
  destinoDeNoLiquidado: DestinoDeLoNoLiquidado | null;
  cuotas: number | null;
  motivoDeNoLiquidado: string | null;
}

/** El anticipo completo, con los avisos que no bloquean (los suyos y los de Bancos al entregarlo). */
export interface AnticipoDto extends Omit<AnticipoResumenDto, 'documento' | 'cuentaBancariaId'> {
  movimiento: MovimientoDelAnticipoDto;
  descripcion: string;
  beneficiarioUsuarioId: string | null;
  localidadId: string | null;
  motivoConVencidos: string | null;
  liquidacion: LiquidacionDelAnticipoDto | null;
  anulacion: { fecha: string; motivo: string } | null;
  puedeAnular: boolean;
  puedeLiquidar: boolean;
  puedeReabrir: boolean;
  avisos: string[];
}
