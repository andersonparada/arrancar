/** Datos de identificación de un tercero, los mínimos para calcular su nombre a mostrar. */
export interface DatosNombreTercero {
  tipo: 'individual' | 'juridica';
  nombres?: string | null;
  apellidos?: string | null;
  razonSocial?: string | null;
  nombreComercial?: string | null;
}

/**
 * Nombre con el que se busca y se lista un tercero: el nombre comercial si lo
 * tiene, y si no, la razón social (jurídica) o nombres + apellidos (individual).
 */
export function calcularNombreMostrar(datos: DatosNombreTercero): string {
  if (datos.tipo === 'juridica') return (datos.nombreComercial || datos.razonSocial || '').trim();
  return (datos.nombreComercial || `${datos.nombres ?? ''} ${datos.apellidos ?? ''}`).trim();
}
