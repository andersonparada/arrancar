import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export type TipoTercero = 'individual' | 'juridica';
export type ClaseCliente = 'directo' | 'intermediario' | 'empresa' | 'subasta';
export type PapelTercero = 'cliente' | 'proveedor';

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
  papeles: { cliente: boolean; proveedor: boolean };
  cliente: { clase: ClaseCliente; activo: boolean } | null;
  proveedor: { categoriaId: string | null; categoriaNombre: string | null; activo: boolean } | null;
}

/** Un resultado de "Buscar contacto": el cliente o proveedor (`contactoNombre` nulo) o una de sus personas. */
export interface ContactoEncontrado {
  terceroId: string;
  terceroNombre: string;
  esCliente: boolean;
  esProveedor: boolean;
  contactoNombre: string | null;
  cargo: string | null;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
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

export interface FichaTercero extends Tercero {
  contactos: Contacto[];
  cliente: Cliente | null;
  proveedor: Proveedor | null;
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

export interface PapelDeCliente {
  clase: ClaseCliente;
  activo: boolean;
  notas: string | null;
}

export interface PapelDeProveedor {
  categoriaId: string | null;
  activo: boolean;
  notas: string | null;
}

/** El papel con que entra alguien al registrarlo desde Clientes o Proveedores. */
export type PapelAlRegistrar = ({ tipo: 'cliente' } & PapelDeCliente) | ({ tipo: 'proveedor' } & PapelDeProveedor);

/** El alta completa: datos, papel y primeros contactos, que el servidor guarda en un solo paso. */
export interface DatosAltaTercero extends DatosTercero {
  papel: PapelAlRegistrar | null;
  contactos: DatosContacto[];
}

export class ApiTerceros {
  constructor(private readonly http: ClienteHttp) {}

  listar(filtros: FiltrosTerceros = {}) {
    return this.http.obtener<TerceroEnListado[]>('/terceros', filtros);
  }

  obtener(id: string) {
    return this.http.obtener<FichaTercero>(`/terceros/${id}`);
  }

  crear(datos: DatosTercero | DatosAltaTercero) {
    return this.http.crear<Tercero>('/terceros', datos);
  }

  buscarContactos(texto: string) {
    return this.http.obtener<ContactoEncontrado[]>('/contactos', { texto });
  }

  cambiarCategoriaProveedor(id: string, datos: { nombre: string; activo: boolean }) {
    return this.http.reemplazar<CategoriaProveedor>(`/proveedores/categorias/${id}`, datos);
  }

  actualizar(id: string, datos: DatosTercero) {
    return this.http.reemplazar<Tercero>(`/terceros/${id}`, datos);
  }

  listarContactos(terceroId: string) {
    return this.http.obtener<Contacto[]>(`/terceros/${terceroId}/contactos`);
  }

  crearContacto(terceroId: string, datos: DatosContacto) {
    return this.http.crear<Contacto>(`/terceros/${terceroId}/contactos`, datos);
  }

  actualizarContacto(terceroId: string, contactoId: string, datos: DatosContacto) {
    return this.http.reemplazar<Contacto>(`/terceros/${terceroId}/contactos/${contactoId}`, datos);
  }

  eliminarContacto(terceroId: string, contactoId: string) {
    return this.http.eliminar(`/terceros/${terceroId}/contactos/${contactoId}`);
  }

  asignarCliente(terceroId: string, datos: PapelDeCliente) {
    return this.http.reemplazar<Cliente>(`/terceros/${terceroId}/cliente`, datos);
  }

  quitarCliente(terceroId: string) {
    return this.http.eliminar(`/terceros/${terceroId}/cliente`);
  }

  listarCategoriasProveedor() {
    return this.http.obtener<CategoriaProveedor[]>('/proveedores/categorias');
  }

  crearCategoriaProveedor(nombre: string) {
    return this.http.crear<CategoriaProveedor>('/proveedores/categorias', { nombre, activo: true });
  }

  asignarProveedor(terceroId: string, datos: PapelDeProveedor) {
    return this.http.reemplazar<Proveedor>(`/terceros/${terceroId}/proveedor`, datos);
  }

  quitarProveedor(terceroId: string) {
    return this.http.eliminar(`/terceros/${terceroId}/proveedor`);
  }
}

export const apiTerceros = new ApiTerceros(clienteHttp);
