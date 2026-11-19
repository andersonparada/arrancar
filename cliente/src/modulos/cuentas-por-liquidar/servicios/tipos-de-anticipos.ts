import type { ClaseDeAnticipo, DestinoDeNoLiquidado } from './tipos-de-reportes';

export type { ClaseDeAnticipo, DestinoDeNoLiquidado };

export type FormaDeAnticipo = 'cheque' | 'nota_de_debito';
export type EstadoDeAnticipo = 'abierto' | 'liquidado' | 'anulado';
export type EstadoBuscadoDeAnticipo = EstadoDeAnticipo | 'todos';

/** Una fila de la lista; el dinero viaja como texto con dos decimales. */
export interface AnticipoResumen {
  id: string;
  numero: string;
  beneficiarioId: string;
  beneficiario: string;
  esEmpleado: boolean;
  clase: ClaseDeAnticipo;
  forma: FormaDeAnticipo;
  documento: number;
  cuentaBancariaId: string;
  fecha: string;
  fechaLimite: string;
  monto: string;
  gastado: string;
  /** Al corte si se pidió; si no, lo que falta hoy. Negativo si se gastó de más. */
  porJustificar: string;
  estado: EstadoDeAnticipo;
  diasDesdeLaEntrega: number;
  diasVencido: number;
  vencido: boolean;
  aviso: string | null;
}

export interface PaginaDeAnticipos {
  elementos: AnticipoResumen[];
  total: number;
  totalPorJustificar: string;
}

export interface ConsultaDeAnticipos {
  estado: EstadoBuscadoDeAnticipo;
  corte?: string | undefined;
  beneficiarioId?: string | undefined;
  vencidos?: boolean | undefined;
  pagina: number;
  limite: number;
}

export interface LiquidacionDelAnticipo {
  fecha: string;
  devuelto: string;
  movimientoDeDevolucionId: string | null;
  reembolsado: string;
  movimientoDeReembolsoId: string | null;
  noLiquidado: string;
  destinoDeNoLiquidado: DestinoDeNoLiquidado | null;
  cuotas: number | null;
  motivoDeNoLiquidado: string | null;
}

/** El anticipo completo, con las acciones que el servidor permite y los avisos que no bloquean. */
export interface Anticipo extends Omit<AnticipoResumen, 'documento' | 'cuentaBancariaId'> {
  movimiento: { id: string; cuentaBancariaId: string; numero: number };
  descripcion: string;
  beneficiarioUsuarioId: string | null;
  localidadId: string | null;
  motivoConVencidos: string | null;
  liquidacion: LiquidacionDelAnticipo | null;
  anulacion: { fecha: string; motivo: string } | null;
  puedeAnular: boolean;
  puedeLiquidar: boolean;
  puedeReabrir: boolean;
  avisos: string[];
}

/** Lo común a las dos formas de entrega. */
interface BaseDeEntrega {
  beneficiarioId: string;
  esEmpleado: boolean;
  beneficiarioUsuarioId?: string | null;
  clase: ClaseDeAnticipo;
  descripcion: string;
  monto: string;
  fecha?: string;
  fechaLimite?: string;
  motivoConVencidos?: string | null;
}

export type SolicitudDeEntrega =
  | (BaseDeEntrega & { forma: 'cheque'; chequeraId: string; noNegociable: boolean })
  | (BaseDeEntrega & { forma: 'nota_de_debito'; cuentaBancariaId: string; referencia: string | null });

/** Anular o reabrir: el motivo y, si mueve dinero en Bancos, la fecha del inverso (por omisión la decide Bancos). */
export interface SolicitudDeCambioDeAnticipo {
  motivo: string;
  fecha?: string;
}

export type SolicitudDeReembolso =
  | { forma: 'cheque'; chequeraId: string; noNegociable: boolean }
  | { forma: 'nota_de_debito'; cuentaBancariaId: string; referencia: string | null };

export interface SolicitudDeLiquidacion {
  fecha?: string;
  devuelto: string;
  cuentaBancariaId?: string;
  referencia?: string | null;
  noLiquidado: string;
  destinoDeNoLiquidado?: DestinoDeNoLiquidado | null;
  cuotas?: number | null;
  pagoVoluntario?: boolean;
  motivoDeNoLiquidado?: string | null;
  reembolso?: SolicitudDeReembolso | null;
}
