export interface ContactoDto {
  id: string;
  nombre: string;
  cargo: string | null;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
  notas: string | null;
}

export type SolicitudDeContacto = Omit<ContactoDto, 'id'>;

/**
 * Un resultado de "Buscar contacto": el propio cliente o proveedor
 * (`contactoNombre` nulo) o una de sus personas de contacto.
 */
export interface ContactoEncontradoDto {
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
