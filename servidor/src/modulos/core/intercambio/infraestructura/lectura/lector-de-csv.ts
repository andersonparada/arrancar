import { ArchivoNoLegible, DemasiadasFilas } from '../../aplicacion/errores.js';
import { ArchivoConCeldasDemasiadoGrandes } from '../../aplicacion/errores-de-lectura.js';
import type { FilaCruda } from '../../aplicacion/puertos/lector-de-filas.js';

export const MAXIMO_DE_FILAS_CRUDAS = 10_000;
export const MAXIMO_DE_COLUMNAS = 200;
export const MAXIMO_DE_CARACTERES_POR_CELDA = 4_000;
const SEPARADORES = [',', ';', '\t'];

/** La primera línea con datos, hasta su salto de línea fuera de comillas. */
function primeraLinea(texto: string): string {
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] === '"') entreComillas = !entreComillas;
    else if (!entreComillas && /[\r\n]/.test(texto[i] as string) && texto.slice(0, i).trim() !== '') {
      return texto.slice(0, i);
    }
  }
  return texto;
}

/** El separador que más aparece, fuera de comillas, en la primera línea con datos (coma si no hay ninguno). */
export function detectarSeparador(texto: string): string {
  const conteo = new Map(SEPARADORES.map((separador) => [separador, 0]));
  let entreComillas = false;
  for (const letra of primeraLinea(texto)) {
    if (letra === '"') entreComillas = !entreComillas;
    else if (!entreComillas && conteo.has(letra)) conteo.set(letra, (conteo.get(letra) ?? 0) + 1);
  }
  const [mejor] = [...conteo.entries()].sort((a, b) => b[1] - a[1]);
  return mejor && mejor[1] > 0 ? mejor[0] : ',';
}

/** Recorre el texto una sola vez (RFC 4180): comillas, comillas dobladas y saltos de línea dentro de comillas. */
class Analizador {
  private readonly filas: FilaCruda[] = [];
  private celdas: string[] = [];
  private campo = '';
  private entreComillas = false;
  private numero = 1;

  constructor(
    private readonly texto: string,
    private readonly separador: string,
  ) {}

  analizar(): FilaCruda[] {
    for (let i = 0; i < this.texto.length; i++) i = this.consumir(i);
    if (this.entreComillas) throw new ArchivoNoLegible();
    this.cerrarFila();
    return this.filas;
  }

  private consumir(i: number): number {
    const letra = this.texto[i] as string;
    if (this.entreComillas) return this.dentroDeComillas(i, letra);
    if (letra === '"' && this.campo === '') this.entreComillas = true;
    else if (letra === this.separador) this.cerrarCampo();
    else if (letra === '\n' || letra === '\r') return this.saltoDeLinea(i, letra);
    else this.campo += letra;
    return i;
  }

  private dentroDeComillas(i: number, letra: string): number {
    if (letra !== '"') this.campo += letra;
    else if (this.texto[i + 1] === '"') {
      this.campo += '"';
      return i + 1;
    } else this.entreComillas = false;
    return i;
  }

  private saltoDeLinea(i: number, letra: string): number {
    this.cerrarFila();
    return letra === '\r' && this.texto[i + 1] === '\n' ? i + 1 : i;
  }

  private cerrarCampo(): void {
    if (this.campo.length > MAXIMO_DE_CARACTERES_POR_CELDA) {
      throw new ArchivoConCeldasDemasiadoGrandes(`una celda pasa de ${MAXIMO_DE_CARACTERES_POR_CELDA} caracteres`);
    }
    this.celdas.push(this.campo.trim());
    this.campo = '';
    if (this.celdas.length > MAXIMO_DE_COLUMNAS) {
      throw new ArchivoConCeldasDemasiadoGrandes(`hay más de ${MAXIMO_DE_COLUMNAS} columnas`);
    }
  }

  private cerrarFila(): void {
    this.cerrarCampo();
    if (this.celdas.some((celda) => celda !== '')) {
      if (this.filas.length >= MAXIMO_DE_FILAS_CRUDAS) throw new DemasiadasFilas(MAXIMO_DE_FILAS_CRUDAS);
      this.filas.push({ numero: this.numero, celdas: this.celdas });
    }
    this.celdas = [];
    this.numero++;
  }
}

/** Lee texto CSV (ya decodificado y sin BOM) como filas crudas de texto; nunca interpreta fórmulas. */
export class LectorDeCsv {
  leer(texto: string): FilaCruda[] {
    return new Analizador(texto, detectarSeparador(texto)).analizar();
  }
}
