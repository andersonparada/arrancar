/** Lo que piden las ventanas de «anular» y «devolver»: el motivo, que queda en la auditoría, y a veces una fecha. */
export interface EdicionDeMotivo {
  motivo: string;
  /** Vacía: la decide el servidor (hoy). */
  fecha: string;
}

export const edicionDeMotivo = (): EdicionDeMotivo => ({ motivo: '', fecha: '' });

/** El motivo es obligatorio: sin él no se envía y el campo dice qué escribir. */
export function faltaElMotivo(edicion: EdicionDeMotivo): Record<string, string> {
  return edicion.motivo.trim() ? {} : { motivo: 'Escriba el motivo: queda registrado en la auditoría.' };
}
