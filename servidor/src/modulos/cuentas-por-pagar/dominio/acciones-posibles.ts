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
  /** Solo un cargo: lo que todavía se debe; con cero ya no se cambia su vencimiento. */
  saldoDelCargoCentavos: number;
  /** Ajustes vigentes de una nota de crédito. */
  ajustesVigentes: number;
  /** Aplicaciones manuales que recibió un cargo (también una nota de débito). */
  aplicacionesManualesRecibidas: number;
  /** Está en una contraseña vigente (las anuladas no cuentan). */
  enContrasena: boolean;
  /** Pagos vigentes que le entregaron a un cargo (los anulados no cuentan). */
  pagosVigentes: number;
  /** Reintegros vigentes contra una nota de crédito (los anulados no cuentan). */
  reintegrosVigentes: number;
}

/** Lo que la pantalla puede ofrecer de un documento (el permiso del usuario lo ve el cliente con `v-permiso`). */
export interface AccionesDelDocumento {
  /** Completarlo en la bandeja. */
  puedeRegistrar: boolean;
  puedeAutorizar: boolean;
  /** Devolverlo de autorizado a registrado; con pagos vigentes ya no. */
  puedeDesautorizar: boolean;
  /** Un cargo registrado o autorizado y con saldo; una nota de crédito no vence. */
  puedeCambiarVencimiento: boolean;
  puedeAnular: boolean;
  puedeEliminar: boolean;
  /** Una nota de crédito no anulada con saldo libre: se compensa contra otro cargo del proveedor. */
  puedeAplicar: boolean;
  /** Una nota de crédito registrada o autorizada con saldo libre: se da de baja todo o parte de él. */
  puedeAjustar: boolean;
  /** Una nota de crédito registrada o autorizada con saldo libre y fuera de toda contraseña: el proveedor devuelve el dinero. */
  puedeReintegrar: boolean;
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
    puedeDesautorizar: estado === 'autorizado' && hechos.pagosVigentes === 0,
    puedeCambiarVencimiento:
      claseDe(tipo) === 'cargo' &&
      ESTADOS_CON_VENCIMIENTO_EDITABLE.includes(estado) &&
      hechos.saldoDelCargoCentavos > 0,
  };
}

/** Anular y eliminar: solo lo del libro, sin notas que lo corrijan y sin ataduras (ver `sinAtaduras`). */
function accionesDeBaja(hechos: HechosDelDocumento) {
  const { estado } = hechos;
  const sePuede = hechos.origen === 'libro_de_compras' && sinAtaduras(hechos);
  return {
    puedeAnular: sePuede && estado !== 'anulado' && hechos.notasVigentes === 0,
    puedeEliminar: sePuede && ESTADOS_QUE_SE_ELIMINAN.includes(estado) && hechos.notasEnTotal === 0,
  };
}

/** Ni ajustes, pagos ni reintegros vigentes, ni aplicaciones manuales recibidas, ni estar en una contraseña vigente. */
const sinAtaduras = (hechos: HechosDelDocumento): boolean =>
  hechos.ajustesVigentes === 0 &&
  hechos.aplicacionesManualesRecibidas === 0 &&
  hechos.pagosVigentes === 0 &&
  hechos.reintegrosVigentes === 0 &&
  !hechos.enContrasena;

/** Aplicar, ajustar y reintegrar son de una nota de crédito con saldo libre y fuera de toda contraseña vigente; el saldo libre de una anulada ya es cero. */
function accionesDeLaNota({ tipo, estado, saldoLibreCentavos, enContrasena }: HechosDelDocumento) {
  const notaConSaldo = tipo === 'nota_de_credito' && saldoLibreCentavos > 0 && !enContrasena;
  return {
    puedeAplicar: notaConSaldo && estado !== 'anulado',
    puedeAjustar: notaConSaldo && ESTADOS_QUE_SE_AJUSTAN.includes(estado),
    puedeReintegrar: notaConSaldo && ESTADOS_QUE_SE_AJUSTAN.includes(estado),
  };
}
