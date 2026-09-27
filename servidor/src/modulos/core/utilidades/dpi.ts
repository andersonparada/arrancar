/**
 * Cantidad de municipios de cada departamento, según el catálogo oficial del
 * INE (`core.departamentos` / `core.municipios`). El CUI codifica el municipio
 * de nacimiento con un número de 2 dígitos que nunca puede superar esta
 * cantidad, así que sirve para validar el DPI sin consultar la base de datos.
 */
const MUNICIPIOS_POR_DEPARTAMENTO: Readonly<Record<string, number>> = {
  '01': 17, // Guatemala
  '02': 8, // El Progreso
  '03': 16, // Sacatepéquez
  '04': 16, // Chimaltenango
  '05': 14, // Escuintla
  '06': 14, // Santa Rosa
  '07': 19, // Sololá
  '08': 8, // Totonicapán
  '09': 24, // Quetzaltenango
  '10': 21, // Suchitepéquez
  '11': 9, // Retalhuleu
  '12': 30, // San Marcos
  '13': 33, // Huehuetenango
  '14': 21, // Quiché
  '15': 8, // Baja Verapaz
  '16': 17, // Alta Verapaz
  '17': 14, // Petén
  '18': 5, // Izabal
  '19': 11, // Zacapa
  '20': 11, // Chiquimula
  '21': 7, // Jalapa
  '22': 17, // Jutiapa
};

/** Quita espacios y guiones: "1234 56789 0101" → "1234567890101". */
export function normalizarDpi(dpi: string): string {
  return dpi.replace(/[\s-]/g, '');
}

/**
 * Valida un CUI (DPI) de Guatemala, ya normalizado.
 *
 * Estructura de sus 13 dígitos: 8 de correlativo, 1 verificador (módulo 11
 * sobre el correlativo, con pesos 2 a 9) y 4 de ubicación de nacimiento
 * (2 de departamento + 2 de municipio, ambos códigos oficiales del INE).
 */
export function esDpiValido(dpi: string): boolean {
  if (!/^\d{13}$/.test(dpi)) return false;

  const correlativo = dpi.slice(0, 8);
  const verificador = Number(dpi[8]);
  const departamento = dpi.slice(9, 11);
  const municipio = Number(dpi.slice(11, 13));

  let suma = 0;
  for (let i = 0; i < correlativo.length; i++) suma += Number(correlativo[i]) * (i + 2);
  const esperado = suma % 11 === 10 ? 0 : suma % 11;
  if (verificador !== esperado) return false;

  const totalMunicipios = MUNICIPIOS_POR_DEPARTAMENTO[departamento];
  return totalMunicipios !== undefined && municipio >= 1 && municipio <= totalMunicipios;
}
