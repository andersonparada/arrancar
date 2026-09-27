import type { TipoDeTercero } from '../../dominio/identidad-de-tercero.js';
import type { ClaseDeCliente, TipoDePapel } from '../../dominio/papeles.js';
import type { ContactoDto } from './contacto.dto.js';

/** Tercero tal como lo ve el usuario en pantalla. */
export interface TerceroDto {
  id: string;
  tipo: TipoDeTercero;
  nombres: string | null;
  apellidos: string | null;
  razonSocial: string | null;
  nombreComercial: string | null;
  nombreMostrar: string;
  nit: string | null;
  dpi: string | null;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
  departamentoCodigo: string | null;
  municipioCodigo: string | null;
  direccion: string | null;
  fotoArchivoId: string | null;
  notas: string | null;
  activo: boolean;
  actualizadoEn: Date;
}

export interface TerceroEnListadoDto extends TerceroDto {
  papeles: Record<TipoDePapel, boolean>;
}

export interface PapelDeClienteDto {
  id: string;
  clase: ClaseDeCliente;
  activo: boolean;
  notas: string | null;
}

export interface PapelDeProveedorDto {
  id: string;
  categoriaId: string | null;
  activo: boolean;
  notas: string | null;
}

export interface FichaDeTerceroDto extends TerceroDto {
  contactos: ContactoDto[];
  cliente: PapelDeClienteDto | null;
  proveedor: PapelDeProveedorDto | null;
}

/** Tercero con datos parecidos a los de otro; se muestra para evitar registrar a alguien dos veces. */
export interface TerceroParecidoDto {
  id: string;
  nombreMostrar: string;
  nit: string | null;
  dpi: string | null;
}

export interface FiltrosDeTerceros {
  /** Busca en el nombre, el NIT, el DPI y el teléfono. */
  texto?: string;
  papel?: TipoDePapel;
  activo?: boolean;
}

/** Lo que se recibe para registrar o cambiar un tercero, ya validado en su forma. */
export interface SolicitudDeTercero {
  tipo: TipoDeTercero;
  nombres: string | null;
  apellidos: string | null;
  razonSocial: string | null;
  nombreComercial: string | null;
  nit: string | null;
  dpi: string | null;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
  departamentoCodigo: string | null;
  municipioCodigo: string | null;
  direccion: string | null;
  fotoArchivoId: string | null;
  notas: string | null;
  activo: boolean;
  /** `true` para guardarlo aunque se parezca a otro tercero. */
  confirmarDuplicado: boolean;
}

export type SolicitudDePapel =
  | { tipo: 'cliente'; clase: ClaseDeCliente; activo: boolean; notas: string | null }
  | { tipo: 'proveedor'; categoriaId: string | null; activo: boolean; notas: string | null };
