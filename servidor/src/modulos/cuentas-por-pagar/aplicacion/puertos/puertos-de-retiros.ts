import type { EstadoDeRetiro, FormaDeRetiro, RetiroDeEfectivo } from '../../dominio/retiros.js';
import type { EstadoDeUnPago } from '../../dominio/pagos.js';

/** El retiro listo para guardar: el id lo genera el caso de uso porque es el origen del movimiento de Bancos. */
export interface RetiroNuevo {
  id: string;
  numero: number;
  anioDeNumero: number;
  forma: FormaDeRetiro;
  fecha: string;
  montoCentavos: number;
  movimientoId: string;
  custodio: string;
  custodioUsuarioId: string | null;
  observaciones: string | null;
}

/** Cómo se anula un retiro guardado. */
export interface AnulacionDeRetiro {
  anuladoPor: string;
  motivo: string;
  /** `AAAA-MM-DD`: la fecha contable de la anulación (CP5-a). */
  fechaDeAnulacion: string;
}

/** Cómo se deja liquidado un retiro. */
export interface LiquidacionDeRetiro {
  liquidadoPor: string;
  fechaDeLiquidacion: string;
  devueltoCentavos: number;
  movimientoDeDevolucionId: string | null;
  faltanteCentavos: number;
  motivoDeFaltante: string | null;
}

export interface RepositorioDeRetiros {
  agregar(retiro: RetiroNuevo): Promise<void>;
  buscar(id: string): Promise<RetiroDeEfectivo | null>;
  /** Igual que `buscar`, y deja la fila bloqueada para este caso de uso. */
  bloquear(id: string): Promise<RetiroDeEfectivo | null>;
  /** El retiro cuyo cheque o nota (o cuyo depósito de devolución) es este movimiento de Bancos; también si está anulado. */
  delMovimiento(movimientoId: string): Promise<RetiroDeEfectivo | null>;
  /** Lo deja `anulado` con quién, cuándo, por qué y la fecha contable. */
  anular(id: string, anulacion: AnulacionDeRetiro): Promise<void>;
  /** Lo deja `liquidado` con lo devuelto y el faltante. */
  liquidar(id: string, liquidacion: LiquidacionDeRetiro): Promise<void>;
  /** Lo deja `abierto` otra vez y limpia la liquidación. */
  reabrir(id: string): Promise<void>;
}

/** Un pago en efectivo de un retiro, como se muestra en su ficha. */
export interface PagoDelRetiro {
  id: string;
  numero: number;
  anioDeNumero: number;
  proveedor: { id: string; nombre: string };
  fecha: string;
  montoCentavos: number;
  estado: EstadoDeUnPago;
}

/** Lo pagado en efectivo con el retiro y, de eso, lo pagado a cargos de activo fijo. */
export interface RepartoDelRetiro {
  totalCentavos: number;
  deActivoCentavos: number;
}

export interface FiltroDeRetiros {
  /** Sin `corte`: el estado de hoy; `todos` no filtra. */
  estado: EstadoDeRetiro | 'todos';
  /** Los retiros por liquidar a esta fecha: de esa fecha o antes, vigentes y aún abiertos entonces. */
  corte?: string;
  desde?: string;
  hasta?: string;
  soloConDisponible: boolean;
  pagina: number;
  limite: number;
}

export interface FilaDeRetiro {
  retiro: RetiroDeEfectivo;
  cuentaBancariaId: string;
  /** El número del cheque o el de la nota de Bancos. */
  numeroDelDocumento: number;
  pagadoCentavos: number;
  /** Al corte si se pidió; si no, el de hoy. */
  disponibleCentavos: number;
}

export interface PaginaDeRetiros {
  filas: FilaDeRetiro[];
  total: number;
  totalDisponibleCentavos: number;
}

export interface ConsultasDeRetiros {
  /** Los pagos en efectivo del retiro, vigentes y anulados, por número. */
  pagosDelRetiro(retiroId: string): Promise<PagoDelRetiro[]>;
  /** Lo que suman los pagos vigentes del retiro (y lo de activo fijo), por cargo. */
  repartoDelRetiro(retiroId: string): Promise<RepartoDelRetiro>;
  listar(filtro: FiltroDeRetiros): Promise<PaginaDeRetiros>;
}

/** Los usuarios que pueden ser custodios: activos y de la empresa del contexto. */
export interface CustodiosDeRetiros {
  /** Nombres y apellidos del usuario, o `null` si no está activo o no entra a la empresa. */
  nombreDelUsuario(usuarioId: string): Promise<string | null>;
}
