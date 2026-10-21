import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { DteRecibido } from '../../dominio/dte-recibido.js';
import type { EstadoDeDte } from '../../dominio/estado-de-dte.js';
import type { TipoDePersonaDelProveedor } from '../../dominio/tipo-de-persona-del-nombre.js';
import type { TipoDte } from '../../dominio/tipos-de-documento.js';

/** Los filtros de la lista de la bandeja; todos opcionales. */
export interface FiltroDeLaBandeja {
  estado?: EstadoDeDte;
  /** Fecha de emisión desde (incluida). */
  desde?: string;
  /** Fecha de emisión hasta (incluida). */
  hasta?: string;
  /** Parte del NIT o del nombre del emisor, de la serie o del número. */
  busqueda?: string;
  tipoDte?: TipoDte;
  loteId?: string;
  /** `true`: solo las filas con proveedor; `false`: solo las que lo necesitan nuevo. */
  conProveedor?: boolean;
}

export interface PaginacionDeLaBandeja {
  pagina: number;
  limite: number;
}

export interface PaginaDeFilasDeLaBandeja {
  filas: DteRecibido[];
  total: number;
}

/** Consultas de la bandeja que no cargan una fila entera. RLS limita todo a la empresa de la transacción. */
export interface ConsultasDeLaBandeja {
  /** De la fecha de emisión más reciente a la más antigua. */
  listar(filtro: FiltroDeLaBandeja, paginacion: PaginacionDeLaBandeja): Promise<PaginaDeFilasDeLaBandeja>;
  /** El concepto activo de la última línea registrada del proveedor en la empresa; `null` si no hay. */
  ultimoConceptoDelProveedor(proveedorId: string): Promise<string | null>;
}

/** Responde solo sí o no (la función `autorizacion_registrada_fuera` de la base): nunca dice en qué empresa. */
export interface AutorizacionesRegistradasFuera {
  /** `true` si otra empresa de la misma cuenta tiene vigente un documento con esa autorización FEL. */
  estaRegistrada(autorizacionFel: string): Promise<boolean>;
}

/** Lo que la bandeja sabe de la fila de un documento recién registrado, anulado o eliminado. */
export interface EnlaceConLaBandeja {
  /** Si hay una fila con esa autorización, la pasa a `registrado` con su documento (aunque estuviera descartada). */
  enlazar(autorizacionFel: string, documentoId: string): Promise<void>;
  /** La fila enlazada con el documento vuelve a `pendiente`, sin documento. Ninguna, ningún cambio. */
  soltar(documentoId: string): Promise<void>;
}

export interface ProveedorDeLaBandeja {
  proveedorId: string;
  terceroId: string;
  creado: boolean;
}

export interface PedidoDeProveedorNuevo {
  nit: string;
  nombre: string;
  tipoDePersona: TipoDePersonaDelProveedor;
  /** El usuario tiene `proveedores.crear`: el mediador no lleva permisos. */
  puedeCrearProveedores: boolean;
}

/** Terceros crea el proveedor del DTE sin duplicar el NIT (orden `terceros.crear_proveedor_desde_dte`). */
export interface CreadorDeProveedores {
  crear(operador: Operador, pedido: PedidoDeProveedorNuevo): Promise<ProveedorDeLaBandeja>;
}
