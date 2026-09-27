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
