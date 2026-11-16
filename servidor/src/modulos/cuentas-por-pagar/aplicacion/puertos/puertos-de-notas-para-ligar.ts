import type { NotaParaLigar } from '../../dominio/nota-para-ligar.js';

/** Una nota marcada para Cuentas por pagar con lo que ya se le aplicó, para elegirla en la ventana de ligar. */
export interface NotaConDisponible extends NotaParaLigar {
  cuentaBancariaNombre: string;
  referencia: string | null;
  /** Lo que suman los pagos vigentes que la ligan. */
  aplicadoCentavos: number;
}

export interface FiltroDeNotasParaLigar {
  cuentaBancariaId?: string;
  /** `AAAA-MM-DD`. */
  desde?: string;
  hasta?: string;
  /** Solo las notas a las que todavía les queda algo por aplicar. */
  soloConDisponible: boolean;
  limite: number;
}

/** Lo que Cuentas por pagar lee de las notas de débito de Bancos (infraestructura, sin orden). */
export interface NotasParaLigar {
  /**
   * La nota con la fila bloqueada para este caso de uso (se bloquea antes que las contraseñas y los cargos); `null` si no
   * existe en la empresa. Dice si es ligable: de débito, suelta, vigente y marcada.
   */
  bloquear(movimientoId: string): Promise<NotaParaLigar | null>;
  /** Las notas marcadas y vigentes de la empresa, las más nuevas primero. */
  listar(filtro: FiltroDeNotasParaLigar): Promise<NotaConDisponible[]>;
}

/** Lo que los pagos vigentes ligan de una nota. */
export interface LigadoAUnaNota {
  /** Suma de los montos de los pagos vigentes. */
  totalCentavos: number;
  /** La parte pagada a cargos con activo fijo, en todos esos pagos. */
  deActivoCentavos: number;
}
