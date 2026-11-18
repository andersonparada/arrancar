import type { RevisionDeCierreDeModulo } from '../../../core/contratos/empresas.contratos.js';

/**
 * Lo que dice el último cierre de la carga inicial, para la línea «Cerrada el … por …, con N diferencias: motivo».
 * Las cargas cerradas antes de que se guardara la revisión salen con `revisionGuardada` falso y ceros.
 */
export interface UltimoCierreDto {
  diferencias: number;
  avisos: number;
  motivo: string | null;
  revisionGuardada: boolean;
}

/** Lo que se hizo con la carga o con su balance de apertura, de la más nueva a la más vieja. */
export type AccionDelHistorialDeCarga = 'cerrar' | 'reabrir' | 'quitar';

export interface EntradaDelHistorialDeCargaDto {
  /** Id de la entrada de auditoría: con él se abre la revisión guardada de un cierre. */
  id: string;
  accion: AccionDelHistorialDeCarga;
  fecha: Date;
  /** Nombre de quien lo hizo. */
  porNombre: string | null;
  motivo: string | null;
  /** Solo en los cierres. */
  diferencias: number | null;
  /** Solo en los cierres. */
  avisos: number | null;
}

/** El balance de apertura firmado que respaldó un cierre, tal como se guardó en la auditoría. */
export interface BalanceDelCierreDto {
  sha256: string;
  nombreOriginal: string;
  paginas: number;
  tamanoBytes: number;
  subidoEn: string;
  subidoPorNombre: string | null;
}

/** La revisión completa de un cierre, tal como la vio quien cerró. */
export interface CierreDeCargaInicialDto {
  id: string;
  empresaId: string;
  fechaDeInicio: string;
  cerradaEn: Date;
  cerradaPor: string | null;
  motivo: string | null;
  diferencias: number;
  avisos: number;
  huella: string;
  modulos: RevisionDeCierreDeModulo[];
  balanceDeApertura: BalanceDelCierreDto | null;
}
