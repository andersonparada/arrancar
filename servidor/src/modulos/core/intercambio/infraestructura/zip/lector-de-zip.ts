import { inflateRawSync } from 'node:zlib';
import { ArchivoNoEsExcel, ExcelDemasiadoGrandeAlDescomprimir } from '../../aplicacion/errores.js';

const FIRMA_FIN_DE_DIRECTORIO = 0x06054b50;
const FIRMA_DIRECTORIO_CENTRAL = 0x02014b50;
const FIRMA_ENCABEZADO_LOCAL = 0x04034b50;
const LARGO_FIN_DE_DIRECTORIO = 22;
const LARGO_ENCABEZADO_CENTRAL = 46;
const LARGO_ENCABEZADO_LOCAL = 30;
const MAXIMO_COMENTARIO = 0xffff;
const MARCA_ZIP64 = 0xffffffff;
const BIT_CIFRADO = 0x1;
const SIN_COMPRESION = 0;
const DEFLATE = 8;

/** Una entrada del directorio central del zip, tal como la declara el archivo (puede mentir). */
export interface EntradaDeZip {
  nombre: string;
  metodo: number;
  tamanoComprimido: number;
  tamanoDeclarado: number;
  desplazamiento: number;
}

/**
 * Lee un zip en memoria sin descomprimir nada por su cuenta: lista las entradas del
 * directorio central y, al pedir una, la infla con un tope de bytes que se respeta
 * aunque los tamaños declarados mientan.
 */
export class LectorDeZip {
  constructor(private readonly contenido: Buffer) {}

  /** @throws ArchivoNoEsExcel si la firma, el directorio o las entradas no son de un zip normal. */
  listarEntradas(maximoDeEntradas: number): EntradaDeZip[] {
    if (this.contenido.length < 4 || this.contenido.readUInt32LE(0) !== FIRMA_ENCABEZADO_LOCAL) {
      throw new ArchivoNoEsExcel();
    }
    const fin = this.buscarFinDeDirectorio();
    const cantidad = this.contenido.readUInt16LE(fin + 10);
    const inicio = this.contenido.readUInt32LE(fin + 16);
    if (cantidad === 0 || cantidad > maximoDeEntradas || inicio === MARCA_ZIP64) throw new ArchivoNoEsExcel();
    return this.leerDirectorio(inicio, cantidad);
  }

  /**
   * @param tope máximo de bytes descomprimidos de esta entrada.
   * @throws ExcelDemasiadoGrandeAlDescomprimir si se pasa del tope.
   */
  descomprimir(entrada: EntradaDeZip, tope: number): Buffer {
    const datos = this.datosComprimidos(entrada);
    if (entrada.metodo === SIN_COMPRESION && datos.length > tope) throw new ExcelDemasiadoGrandeAlDescomprimir();
    const resultado = entrada.metodo === SIN_COMPRESION ? datos : this.inflar(datos, tope);
    if (resultado.length !== entrada.tamanoDeclarado) throw new ArchivoNoEsExcel();
    return resultado;
  }

  private inflar(datos: Buffer, tope: number): Buffer {
    try {
      return inflateRawSync(datos, { maxOutputLength: Math.max(tope, 1) });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ERR_BUFFER_TOO_LARGE') {
        throw new ExcelDemasiadoGrandeAlDescomprimir();
      }
      throw new ArchivoNoEsExcel();
    }
  }

  private buscarFinDeDirectorio(): number {
    const menor = Math.max(0, this.contenido.length - LARGO_FIN_DE_DIRECTORIO - MAXIMO_COMENTARIO);
    for (let i = this.contenido.length - LARGO_FIN_DE_DIRECTORIO; i >= menor; i--) {
      if (this.contenido.readUInt32LE(i) === FIRMA_FIN_DE_DIRECTORIO) return i;
    }
    throw new ArchivoNoEsExcel();
  }

  private leerDirectorio(inicio: number, cantidad: number): EntradaDeZip[] {
    const entradas: EntradaDeZip[] = [];
    let posicion = inicio;
    for (let i = 0; i < cantidad; i++) {
      const { entrada, siguiente } = this.leerEntrada(posicion);
      entradas.push(entrada);
      posicion = siguiente;
    }
    return entradas;
  }

  private leerEntrada(posicion: number): { entrada: EntradaDeZip; siguiente: number } {
    const b = this.contenido;
    if (posicion + LARGO_ENCABEZADO_CENTRAL > b.length || b.readUInt32LE(posicion) !== FIRMA_DIRECTORIO_CENTRAL) {
      throw new ArchivoNoEsExcel();
    }
    const largoNombre = b.readUInt16LE(posicion + 28);
    const largoAdicional = b.readUInt16LE(posicion + 30) + b.readUInt16LE(posicion + 32);
    const inicioNombre = posicion + LARGO_ENCABEZADO_CENTRAL;
    const siguiente = inicioNombre + largoNombre + largoAdicional;
    const metodo = b.readUInt16LE(posicion + 10);
    const sinSoporte =
      (b.readUInt16LE(posicion + 8) & BIT_CIFRADO) !== 0 || (metodo !== DEFLATE && metodo !== SIN_COMPRESION);
    if (siguiente > b.length || sinSoporte) throw new ArchivoNoEsExcel();
    const entrada = {
      nombre: b.toString('utf8', inicioNombre, inicioNombre + largoNombre),
      metodo,
      tamanoComprimido: b.readUInt32LE(posicion + 20),
      tamanoDeclarado: b.readUInt32LE(posicion + 24),
      desplazamiento: b.readUInt32LE(posicion + 42),
    };
    return { entrada, siguiente };
  }

  private datosComprimidos(entrada: EntradaDeZip): Buffer {
    const b = this.contenido;
    const local = entrada.desplazamiento;
    if (local + LARGO_ENCABEZADO_LOCAL > b.length || b.readUInt32LE(local) !== FIRMA_ENCABEZADO_LOCAL) {
      throw new ArchivoNoEsExcel();
    }
    const inicio = local + LARGO_ENCABEZADO_LOCAL + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
    const fin = inicio + entrada.tamanoComprimido;
    if (fin > b.length) throw new ArchivoNoEsExcel();
    return b.subarray(inicio, fin);
  }
}
