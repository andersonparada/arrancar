/** Lo que piden las ventanas de «anular» o «descartar»: el motivo, que queda en la auditoría. */
export interface EdicionDeMotivo {
  abierta: boolean;
  motivo: string;
}

export const motivoVacio = (): EdicionDeMotivo => ({ abierta: false, motivo: '' });

/** El motivo es obligatorio: sin él no se envía y el campo dice qué escribir. */
export function faltaElMotivo(edicion: EdicionDeMotivo): Record<string, string> {
  return edicion.motivo.trim() ? {} : { motivo: 'Escriba el motivo: queda registrado en la auditoría.' };
}
