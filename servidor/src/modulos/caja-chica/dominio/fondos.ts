/** El recurso con alcance y de auditoría de los fondos. */
export const RECURSO_DE_FONDOS = 'caja-chica.fondos';

/** La clave del módulo como origen de los movimientos de Bancos. */
export const MODULO_DE_ORIGEN = 'caja-chica';

export type EstadoDelFondo = 'abierto' | 'cerrado';
export type TipoDeCambioDeMonto = 'apertura' | 'aumento' | 'disminucion' | 'cierre';
export type FormaDeCambioDeMonto = 'cheque' | 'nota_de_debito' | 'nota_de_credito' | 'saldo_inicial' | 'sin_deposito';

/** Cómo sale el dinero del banco hacia el fondo (apertura y aumento). */
export type FormaDeEntrega = 'cheque' | 'nota_de_debito';

/** Un fondo fijo de efectivo a cargo de un custodio. El monto y el custodio salen de sus cambios y su historial. */
export interface Fondo {
  id: string;
  nombre: string;
  localidadId: string | null;
  topeCentavos: number | null;
  cuentaBancariaId: string | null;
  origen: 'banco' | 'saldo_inicial';
  fechaDeApertura: string;
  estado: EstadoDelFondo;
  fechaDeCierre: string | null;
  motivoDeCierre: string | null;
  observaciones: string | null;
}

/** Un tramo del historial de custodios; el vigente no tiene `hasta`. */
export interface CustodioDelFondo {
  id: string;
  custodio: string;
  custodioUsuarioId: string | null;
  desde: string;
  hasta: string | null;
  motivoDelCambio: string | null;
}

/** Cada vez que cambia el dinero del fondo, con el cheque o la nota de Bancos que lo movió. */
export interface CambioDeMonto {
  id: string;
  tipo: TipoDeCambioDeMonto;
  forma: FormaDeCambioDeMonto;
  fecha: string;
  montoCentavos: number;
  movimientoId: string | null;
  estado: 'vigente' | 'anulado';
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}

/** Lo que ya se sabe del dinero del fondo, para decidir. */
export interface CifrasDelFondo {
  montoCentavos: number;
  pendienteCentavos: number;
  valesCentavos: number;
}

/** Cuánto movimiento tiene el fondo fuera de su apertura (por eso no se puede anular sin más). */
export interface UsoDelFondo {
  comprobantes: number;
  arqueos: number;
  reposiciones: number;
  vales: number;
}
