import { DatoInvalido } from '../errores.js';
import { ObjetoValor } from '../objeto-valor.js';

const FORMATO_DPI = /^\d{13}$/;

/**
 * Cantidad de municipios de cada departamento según el INE. El CUI codifica el
 * municipio de nacimiento con dos dígitos que nunca superan esta cantidad, así que
 * sirve para validar el DPI sin consultar la base de datos.
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

export class DpiInvalido extends DatoInvalido {
  readonly codigo = 'dpi_invalido';

  constructor(texto: string) {
    super(`El DPI "${texto}" no es válido (revise los 13 dígitos).`);
  }
}

/** Quita espacios y guiones: "1234 56789 0101" → "1234567890101". */
export function normalizarDpi(texto: string): string {
  return texto.replace(/[\s-]/g, '');
}

/** Módulo 11 sobre los 8 dígitos del correlativo, con pesos de 2 a 9; un resultado de 10 se escribe 0. */
function verificadorEsperado(correlativo: string): number {
  const suma = [...correlativo].reduce((total, digito, posicion) => total + Number(digito) * (posicion + 2), 0);
  return suma % 11 === 10 ? 0 : suma % 11;
}

function esLugarDeNacimientoValido(departamento: string, municipio: number): boolean {
  const totalMunicipios = MUNICIPIOS_POR_DEPARTAMENTO[departamento];
  return totalMunicipios !== undefined && municipio >= 1 && municipio <= totalMunicipios;
}

/**
 * Valida un CUI (DPI) ya normalizado. Sus 13 dígitos son: 8 de correlativo, 1
 * verificador y 4 del lugar de nacimiento (2 de departamento y 2 de municipio).
 */
export function esDpiValido(dpi: string): boolean {
  if (!FORMATO_DPI.test(dpi)) return false;
  if (Number(dpi[8]) !== verificadorEsperado(dpi.slice(0, 8))) return false;
  return esLugarDeNacimientoValido(dpi.slice(9, 11), Number(dpi.slice(11, 13)));
}

/** Código Único de Identificación (CUI) del Documento Personal de Identificación de Guatemala. */
export class Dpi extends ObjetoValor<string> {
  private constructor(valor: string) {
    super(valor);
  }

  static crear(texto: string): Dpi {
    const normalizado = normalizarDpi(texto);
    if (!esDpiValido(normalizado)) throw new DpiInvalido(texto);
    return new Dpi(normalizado);
  }

  /** Código INE del departamento de nacimiento, por ejemplo "01" para Guatemala. */
  get departamentoDeNacimiento(): string {
    return this.valor.slice(9, 11);
  }

  /** Código INE completo del municipio de nacimiento (departamento + municipio), por ejemplo "0101". */
  get municipioDeNacimiento(): string {
    return this.valor.slice(9, 13);
  }
}
