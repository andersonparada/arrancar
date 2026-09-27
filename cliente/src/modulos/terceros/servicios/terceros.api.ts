import { api } from '@/modulos/core/servicios/cliente-http';

export type TipoTercero = 'individual' | 'juridica';
export type ClaseCliente = 'directo' | 'intermediario' | 'empresa' | 'subasta';
export type PapelTercero = 'cliente' | 'proveedor' | 'trabajador';

export interface Tercero {
  id: string;
  tipo: TipoTercero;
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
  actualizadoEn: string;
}

export interface TerceroEnListado extends Tercero {
  papeles: { cliente: boolean; proveedor: boolean; trabajador: boolean };
}

export interface Contacto {
  id: string;
  nombre: string;
  cargo: string | null;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
  notas: string | null;
}

export interface Cliente {
  id: string;
  clase: ClaseCliente;
  activo: boolean;
  notas: string | null;
}

export interface Proveedor {
  id: string;
  categoriaId: string | null;
  activo: boolean;
  notas: string | null;
}

export interface CategoriaProveedor {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Trabajador {
  id: string;
  cargo: string | null;
  fechaIngreso: string | null;
  fechaSalida: string | null;
  activo: boolean;
  notas: string | null;
}

export interface FichaTercero extends Tercero {
  contactos: Contacto[];
  cliente: Cliente | null;
  proveedor: Proveedor | null;
  trabajador: Trabajador | null;
}

export interface DatosTercero {
  tipo: TipoTercero;
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
  confirmarDuplicado?: boolean;
}

export interface DatosContacto {
  nombre: string;
  cargo: string | null;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
  notas: string | null;
}

export interface FiltrosTerceros {
  texto?: string;
  papel?: PapelTercero;
  activo?: boolean;
  [clave: string]: string | number | boolean | undefined;
}

export const tercerosApi = {
  listar: (filtros: FiltrosTerceros = {}) => api.obtener<TerceroEnListado[]>('/terceros', filtros),
  obtener: (id: string) => api.obtener<FichaTercero>(`/terceros/${id}`),
  crear: (datos: DatosTercero) => api.crear<Tercero>('/terceros', datos),
  actualizar: (id: string, datos: DatosTercero) => api.reemplazar<Tercero>(`/terceros/${id}`, datos),

  listarContactos: (terceroId: string) => api.obtener<Contacto[]>(`/terceros/${terceroId}/contactos`),
  crearContacto: (terceroId: string, datos: DatosContacto) =>
    api.crear<Contacto>(`/terceros/${terceroId}/contactos`, datos),
  actualizarContacto: (terceroId: string, contactoId: string, datos: DatosContacto) =>
    api.reemplazar<Contacto>(`/terceros/${terceroId}/contactos/${contactoId}`, datos),
  eliminarContacto: (terceroId: string, contactoId: string) =>
    api.eliminar(`/terceros/${terceroId}/contactos/${contactoId}`),

  asignarCliente: (terceroId: string, datos: { clase: ClaseCliente; activo: boolean; notas: string | null }) =>
    api.reemplazar<Cliente>(`/terceros/${terceroId}/cliente`, datos),
  quitarCliente: (terceroId: string) => api.eliminar(`/terceros/${terceroId}/cliente`),

  listarCategoriasProveedor: () => api.obtener<CategoriaProveedor[]>('/proveedores/categorias'),
  crearCategoriaProveedor: (nombre: string) =>
    api.crear<CategoriaProveedor>('/proveedores/categorias', { nombre, activo: true }),
  asignarProveedor: (terceroId: string, datos: { categoriaId: string | null; activo: boolean; notas: string | null }) =>
    api.reemplazar<Proveedor>(`/terceros/${terceroId}/proveedor`, datos),
  quitarProveedor: (terceroId: string) => api.eliminar(`/terceros/${terceroId}/proveedor`),

  asignarTrabajador: (
    terceroId: string,
    datos: {
      cargo: string | null;
      fechaIngreso: string | null;
      fechaSalida: string | null;
      activo: boolean;
      notas: string | null;
    },
  ) => api.reemplazar<Trabajador>(`/terceros/${terceroId}/trabajador`, datos),
  quitarTrabajador: (terceroId: string) => api.eliminar(`/terceros/${terceroId}/trabajador`),
};
