import { claseDe, type EstadoDeDocumento, type OrigenDeDocumento, type TipoDeDocumento } from './tipos-de-documento.js';

/** Lo que se sabe de un documento para decidir qué se puede hacer con él. */
export interface HechosDelDocumento {
  /** Un saldo inicial no se anula ni se elimina por Documentos (se elimina desde su ventana de Administración). */
  origen: OrigenDeDocumento;
  tipo: TipoDeDocumento;
  estado: EstadoDeDocumento;
  /** Notas de crédito o de débito que lo corrigen y siguen vigentes. */
  notasVigentes: number;
  /** Todas las notas que lo corrigen, también las anuladas (la llave foránea las cuenta). */
  notasEnTotal: number;
  /** Solo una nota de crédito: lo que queda libre tras aplicaciones y ajustes vigentes (en un cargo no se usa). */
  saldoLibreCentavos: number;
  /** Ajustes vigentes de una nota de crédito. */
  ajustesVigentes: number;
  /** Aplicaciones manuales que recibió un cargo (también una nota de débito). */
  aplicacionesManualesRecibidas: number;
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
  /** Una nota de crédito no anulada con saldo libre: se compensa contra otro cargo del proveedor. */
  puedeAplicar: boolean;
  /** Una nota de crédito registrada o autorizada con saldo libre: se da de baja todo o parte de él. */
  puedeAjustar: boolean;
}

const ESTADOS_CON_VENCIMIENTO_EDITABLE: readonly EstadoDeDocumento[] = ['registrado', 'autorizado'];
const ESTADOS_QUE_SE_AJUSTAN: readonly EstadoDeDocumento[] = ['registrado', 'autorizado'];
const ESTADOS_QUE_SE_ELIMINAN: readonly EstadoDeDocumento[] = ['pendiente', 'registrado'];

/**
 * Las reglas de §3.1 y §4.7 del diseño. Se anula lo que no está anulado y no tiene notas vigentes; se elimina solo lo
 * pendiente o registrado y sin notas (ni siquiera anuladas, que se quedan como rastro). Una nota con ajustes vigentes y un
 * cargo con aplicaciones manuales recibidas no se dan de baja (§5.3 y §5.4 de CP2). Es una guía para la pantalla:
 * quien manda es el caso de uso, que vuelve a revisar con la fila bloqueada y con las reglas de Libro de compras.
 */
export function accionesDelDocumento(hechos: HechosDelDocumento): AccionesDelDocumento {
  const { tipo, estado } = hechos;
  return {
    ...accionesDeLaNota(hechos),
    ...accionesDeBaja(hechos),
    puedeRegistrar: estado === 'pendiente',
    puedeAutorizar: estado === 'registrado',
    puedeDesautorizar: estado === 'autorizado',
    puedeCambiarVencimiento: claseDe(tipo) === 'cargo' && ESTADOS_CON_VENCIMIENTO_EDITABLE.includes(estado),
  };
}

/** Anular y eliminar: solo lo del libro, sin notas que lo corrijan, ni ajustes vigentes ni aplicaciones manuales. */
function accionesDeBaja(hechos: HechosDelDocumento) {
  const { estado } = hechos;
  const esDelLibro = hechos.origen === 'libro_de_compras';
  const sinAtaduras = hechos.ajustesVigentes === 0 && hechos.aplicacionesManualesRecibidas === 0;
  return {
    puedeAnular: esDelLibro && estado !== 'anulado' && hechos.notasVigentes === 0 && sinAtaduras,
    puedeEliminar: esDelLibro && ESTADOS_QUE_SE_ELIMINAN.includes(estado) && hechos.notasEnTotal === 0 && sinAtaduras,
  };
}

/** Aplicar y ajustar son de una nota de crédito con saldo libre; el saldo libre de una anulada ya es cero. */
function accionesDeLaNota({ tipo, estado, saldoLibreCentavos }: HechosDelDocumento) {
  const notaConSaldo = tipo === 'nota_de_credito' && saldoLibreCentavos > 0;
  return {
    puedeAplicar: notaConSaldo && estado !== 'anulado',
    puedeAjustar: notaConSaldo && ESTADOS_QUE_SE_AJUSTAN.includes(estado),
  };
}
