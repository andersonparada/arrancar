import { claseDe, type EstadoDeDocumento, type TipoDeDocumento } from './tipos-de-documento.js';

/** Lo que se sabe de un documento para decidir qué se puede hacer con él. */
export interface HechosDelDocumento {
  tipo: TipoDeDocumento;
  estado: EstadoDeDocumento;
  /** Notas de crédito o de débito que lo corrigen y siguen vigentes. */
  notasVigentes: number;
  /** Todas las notas que lo corrigen, también las anuladas (la llave foránea las cuenta). */
  notasEnTotal: number;
}

/** Lo que la pantalla puede ofrecer de un documento (el permiso del usuario lo ve el cliente con `v-permiso`). */
export interface AccionesDelDocumento {
  /** Completarlo en la bandeja. */
  puedeRegistrar: boolean;
  puedeAutorizar: boolean;
  /** Devolverlo de autorizado a registrado; los pagos (CP4) lo cerrarán. */
  puedeDesautorizar: boolean;
  /** Un cargo registrado o autorizado; una nota de crédito no vence. */
  puedeCambiarVencimiento: boolean;
  puedeAnular: boolean;
  puedeEliminar: boolean;
}

const ESTADOS_CON_VENCIMIENTO_EDITABLE: readonly EstadoDeDocumento[] = ['registrado', 'autorizado'];
const ESTADOS_QUE_SE_ELIMINAN: readonly EstadoDeDocumento[] = ['pendiente', 'registrado'];

/**
 * Las reglas de §3.1 y §4.7 del diseño. Se anula lo que no está anulado y no tiene notas vigentes; se elimina solo lo
 * pendiente o registrado y sin notas (ni siquiera anuladas, que se quedan como rastro). Es una guía para la pantalla:
 * quien manda es el caso de uso, que vuelve a revisar con la fila bloqueada y con las reglas de Libro de compras.
 */
export function accionesDelDocumento(hechos: HechosDelDocumento): AccionesDelDocumento {
  const { tipo, estado } = hechos;
  return {
    puedeRegistrar: estado === 'pendiente',
    puedeAutorizar: estado === 'registrado',
    puedeDesautorizar: estado === 'autorizado',
    puedeCambiarVencimiento: claseDe(tipo) === 'cargo' && ESTADOS_CON_VENCIMIENTO_EDITABLE.includes(estado),
    puedeAnular: estado !== 'anulado' && hechos.notasVigentes === 0,
    puedeEliminar: ESTADOS_QUE_SE_ELIMINAN.includes(estado) && hechos.notasEnTotal === 0,
  };
}
