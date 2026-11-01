import { ArchivoNoLegible } from '../../../aplicacion/errores.js';

const MAXIMO_DE_CADENAS = 200_000;
const MAXIMO_DE_LETRAS_POR_CADENA = 32_767;
/** Una cadena de la tabla ocupa al menos 3 bytes (largo y banderas). */
const BYTES_MINIMOS_POR_CADENA = 3;

/**
 * Lee los datos del registro SST y de sus CONTINUE como si fueran uno solo, pero sabiendo dónde cortan: al
 * cruzar un corte en medio de las letras de una cadena, el nuevo registro empieza con un byte de banderas que
 * dice si las letras que siguen son de 1 o de 2 bytes.
 */
class CursorDeSegmentos {
  private indice = 0;
  private posicion = 0;

  constructor(private readonly segmentos: readonly Buffer[]) {}

  /** Bytes que quedan sin leer en todos los segmentos. */
  restantes(): number {
    const resto = this.segmentos.slice(this.indice).reduce((suma, segmento) => suma + segmento.length, 0);
    return resto - this.posicion;
  }

  byte(): number {
    return this.asegurar(1).readUInt8(this.consumir(1));
  }

  u16(): number {
    return this.asegurar(2).readUInt16LE(this.consumir(2));
  }

  u32(): number {
    return this.asegurar(4).readUInt32LE(this.consumir(4));
  }

  /** Salta bytes que no son letras (formatos y datos fonéticos); pueden cruzar cortes sin byte de banderas. */
  saltar(bytes: number): void {
    let faltan = bytes;
    while (faltan > 0) {
      if (this.posicion >= this.actual().length) this.siguienteSegmento();
      const tomar = Math.min(faltan, this.actual().length - this.posicion);
      this.posicion += tomar;
      faltan -= tomar;
    }
  }

  /** Lee `letras` caracteres; si cruza un corte, el byte de banderas del nuevo segmento decide el ancho. */
  texto(letras: number, altaAlInicio: boolean): string {
    const partes: string[] = [];
    let alta = altaAlInicio;
    let faltan = letras;
    while (faltan > 0) {
      if (this.posicion >= this.actual().length) {
        this.siguienteSegmento();
        alta = (this.byte() & 1) === 1;
      }
      const ancho = alta ? 2 : 1;
      const tomar = Math.min(faltan, Math.floor((this.actual().length - this.posicion) / ancho));
      if (tomar === 0) throw new ArchivoNoLegible();
      partes.push(this.actual().toString(alta ? 'utf16le' : 'latin1', this.posicion, this.posicion + tomar * ancho));
      this.posicion += tomar * ancho;
      faltan -= tomar;
    }
    return partes.join('');
  }

  private actual(): Buffer {
    const segmento = this.segmentos[this.indice];
    if (!segmento) throw new ArchivoNoLegible();
    return segmento;
  }

  private siguienteSegmento(): void {
    this.indice++;
    this.posicion = 0;
    this.actual();
  }

  /** Un dato de largo fijo nunca se parte: si el segmento se acabó, empieza en el siguiente. */
  private asegurar(bytes: number): Buffer {
    if (this.posicion >= this.actual().length) this.siguienteSegmento();
    if (this.posicion + bytes > this.actual().length) throw new ArchivoNoLegible();
    return this.actual();
  }

  private consumir(bytes: number): number {
    const inicio = this.posicion;
    this.posicion += bytes;
    return inicio;
  }
}

/** Una cadena de la tabla: largo, banderas (UTF-16, formato, fonética), letras y los datos de formato que se saltan. */
function leerCadena(cursor: CursorDeSegmentos): string {
  const letras = cursor.u16();
  if (letras > MAXIMO_DE_LETRAS_POR_CADENA) throw new ArchivoNoLegible();
  const banderas = cursor.byte();
  const formatos = banderas & 0x08 ? cursor.u16() : 0;
  const fonetica = banderas & 0x04 ? cursor.u32() : 0;
  const texto = cursor.texto(letras, (banderas & 0x01) === 1);
  cursor.saltar(formatos * 4 + fonetica);
  return texto;
}

/**
 * La tabla de cadenas compartidas (SST) con los CONTINUE que la siguen. Antes de leer se compara lo que dice la
 * cabecera con lo que cabe: no más de 200,000 cadenas y no más de las que caben en los bytes que quedan.
 * @param segmentos los datos del registro SST y de cada CONTINUE, en orden.
 * @throws ArchivoNoLegible si la tabla miente o se corta.
 */
export function leerTablaDeCadenas(segmentos: readonly Buffer[]): string[] {
  const cursor = new CursorDeSegmentos(segmentos);
  cursor.u32();
  const unicas = cursor.u32();
  if (unicas > MAXIMO_DE_CADENAS || unicas > cursor.restantes() / BYTES_MINIMOS_POR_CADENA) {
    throw new ArchivoNoLegible();
  }
  return Array.from({ length: unicas }, () => leerCadena(cursor));
}
