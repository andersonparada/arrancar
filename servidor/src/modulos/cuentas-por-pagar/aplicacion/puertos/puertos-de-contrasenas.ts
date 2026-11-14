import type { EstadoDeContrasena } from '../../dominio/contrasena.js';
import type { LineaDePago } from '../../dominio/pagos.js';
import type { AplicacionDeContrasena } from '../../dominio/reparto-de-contrasena.js';
import type { FilaDeDocumento, PaginacionDeDocumentos } from './puertos-de-consultas.js';

/** Lo que se guarda de una contraseña nueva; nace `vigente`. */
export interface ContrasenaNueva {
  proveedorId: string;
  numero: number;
  anioDeNumero: number;
  /** `AAAA-MM-DD`. */
  fecha: string;
  fechaDePago: string;
  observaciones: string | null;
  /** Los ids (de aquí) de sus cargos y notas. */
  documentoIds: readonly string[];
}

/** Lo único que se cambia de una contraseña ya hecha. */
export interface CambiosDeContrasena {
  fechaDePago: string;
  observaciones: string | null;
}

/** Quién anuló la contraseña y por qué. */
export interface AnulacionDeContrasena {
  anuladaPor: string;
  motivo: string;
}

/** La contraseña vigente donde está un documento. */
export interface ContrasenaDelDocumento {
  id: string;
  /** Ya formateado: `15` o `2026-15`. */
  numero: string;
}

export interface RepositorioDeContrasenas {
  /** Guarda la contraseña con sus documentos y devuelve su id. */
  agregar(nueva: ContrasenaNueva): Promise<string>;
  /** Guarda lo que las notas rebajan de los cargos dentro de la contraseña (forma `contrasena`). */
  guardarReparto(
    contrasenaId: string,
    proveedorId: string,
    aplicaciones: readonly AplicacionDeContrasena[],
  ): Promise<void>;
  /** Borra todas las aplicaciones de forma `contrasena` de esta contraseña: lo aplicado vuelve al saldo libre de sus notas. */
  borrarReparto(contrasenaId: string): Promise<void>;
  /** Bloquea la contraseña hasta el fin de la transacción (serializa las ediciones de una misma contraseña). */
  bloquear(contrasenaId: string): Promise<void>;
  /** Cambia la fecha prometida de pago y las observaciones. */
  actualizar(contrasenaId: string, cambios: CambiosDeContrasena): Promise<void>;
  /** Mete documentos más a la contraseña (del proveedor que ya tiene). */
  agregarDocumentos(contrasenaId: string, proveedorId: string, documentoIds: readonly string[]): Promise<void>;
  /** Saca un documento de la contraseña: borra su fila. */
  quitarDocumento(contrasenaId: string, documentoId: string): Promise<void>;
  /** La deja `anulada` con quién, cuándo y por qué, y pone `vigente = false` en sus documentos (quedan libres). */
  anular(contrasenaId: string, anulacion: AnulacionDeContrasena): Promise<void>;
  /**
   * Pone `impresa_en` si era nulo, en una sola sentencia (dos impresiones a la vez no son las dos «primera»).
   * Devuelve si esta fue la primera impresión.
   */
  marcarImpresion(contrasenaId: string): Promise<boolean>;
  /** La contraseña vigente de cada documento que está en una; los demás no aparecen. */
  vigentesDe(documentoIds: readonly string[]): Promise<Map<string, ContrasenaDelDocumento>>;
}

/** Si el proveedor existe en la cuenta activa (una contraseña también se hace a un proveedor inactivo). */
export interface ProveedoresDeContrasenas {
  existe(proveedorId: string): Promise<boolean>;
}

/** La contraseña guardada con los nombres de quienes intervinieron. */
export interface ContrasenaGuardada {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  proveedorNit: string | null;
  numero: number;
  anioDeNumero: number;
  fecha: string;
  fechaDePago: string;
  observaciones: string | null;
  estado: EstadoDeContrasena;
  /** Instante ISO de la primera impresión; nulo si nunca se imprimió. */
  impresaEn: string | null;
  anulacion: { motivo: string; anuladaPorNombre: string | null; anuladaEn: string } | null;
  creadoPorNombre: string | null;
  creadoEn: string;
}

/** Una contraseña con sus documentos (con sus saldos de hoy) y lo que sus notas aplicaron dentro de ella. */
export interface ContrasenaConDocumentos {
  contrasena: ContrasenaGuardada;
  documentos: FilaDeDocumento[];
  /** Por id de nota: lo que aplicó dentro de esta contraseña, en centavos. */
  aplicadoPorNota: ReadonlyMap<string, number>;
  /**
   * Lo que los pagos (vigentes y anulados) entregaron a sus cargos, buscado por `aplicaciones_de_pagos.contrasena_id`:
   * sirve igual si un pago llega a cubrir varias contraseñas del mismo proveedor.
   */
  pagos: LineaDePago[];
}

export interface FiltroDeContrasenas {
  proveedorId?: string;
  /** `vigente` por omisión. */
  estado: EstadoDeContrasena | 'todas';
  /** Fecha de la contraseña, desde y hasta (`AAAA-MM-DD`), incluidas. */
  desde?: string;
  hasta?: string;
  /** Fecha prometida de pago, desde y hasta, incluidas. */
  pagoDesde?: string;
  pagoHasta?: string;
}

export interface ConsultasDeContrasenas {
  listar(
    filtro: FiltroDeContrasenas,
    paginacion: PaginacionDeDocumentos,
  ): Promise<{ filas: ContrasenaConDocumentos[]; total: number }>;
  /** La contraseña con sus documentos; `null` si no existe en la empresa. */
  detalle(id: string): Promise<ContrasenaConDocumentos | null>;
  /** Los cargos con saldo y las notas con saldo libre del proveedor que no están en una contraseña vigente. */
  disponiblesDe(proveedorId: string): Promise<FilaDeDocumento[]>;
  /** Nombre y apellidos de un usuario (quien imprime); `null` si no se conoce. */
  nombreDelUsuario(usuarioId: string): Promise<string | null>;
}
