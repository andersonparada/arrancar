import { createHash } from 'node:crypto';
import type { Almacenamiento } from '../../compartido/aplicacion/almacenamiento.js';
import type {
  DocumentoAbierto,
  DocumentoGuardado,
  DocumentosProtegidos,
  OpcionesDeDocumento,
} from '../../compartido/aplicacion/documentos-protegidos.js';
import { RecursoNoEncontrado } from '../../compartido/aplicacion/errores.js';
import type { Operador } from '../../compartido/aplicacion/operador.js';
import {
  DocumentoDemasiadoGrande,
  DocumentoNoAceptado,
  esPdfPorFirma,
  LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO,
  LIMITE_DE_BYTES_DE_PDF,
} from '../dominio/documento.js';
import { FormatoDeImagenNoAceptado } from '../dominio/imagen.js';
import { RutasDeArchivo } from '../dominio/rutas-de-archivo.js';
import type { InspectorDePdf } from './puertos/inspector-de-pdf.js';
import type { OptimizadorDeImagenes } from './puertos/optimizador-de-imagenes.js';
import type { RepositorioArchivos } from './puertos/repositorio-archivos.js';

interface Dependencias {
  repositorio: RepositorioArchivos;
  almacenamiento: Almacenamiento;
  optimizador: OptimizadorDeImagenes;
  inspector: InspectorDePdf;
}

/** Lo que se guardará: el contenido ya revisado y sus datos. */
interface DocumentoPreparado {
  contenido: Buffer;
  tipoMime: string;
  extension: 'pdf' | 'webp';
  paginas: number | null;
  ancho: number | null;
  alto: number | null;
}

interface Registro {
  operador: Operador;
  opciones: OpcionesDeDocumento;
  recibido: Buffer;
  documento: DocumentoPreparado;
  rutas: RutasDeArchivo;
}

const MEGABYTE = 1024 * 1024;
const LARGO_MAXIMO_DEL_NOMBRE = 200;
/** Las fotos de documentos se guardan más grandes y con más calidad que las demás para que se lean. */
const MEDIDAS_DE_FOTO = {
  original: { ladoMaximo: 2400, calidad: 85 },
  miniatura: { ladoMaximo: 400, calidad: 70 },
};

const sha256 = (contenido: Buffer) => createHash('sha256').update(contenido).digest('hex');

/** Guarda documentos revisados: los PDF pasan por el inspector y las fotos por el optimizador. */
export class GestorDeDocumentos implements DocumentosProtegidos {
  constructor(private readonly dependencias: Dependencias) {}

  async guardar(operador: Operador, recibido: Buffer, opciones: OpcionesDeDocumento): Promise<DocumentoGuardado> {
    const documento = await this.preparar(recibido);
    const nombre = `${crypto.randomUUID()}.${documento.extension}`;
    const rutas = RutasDeArchivo.deDocumento(operador.empresaId, new Date(), nombre);
    const { almacenamiento } = this.dependencias;
    await almacenamiento.guardar(rutas.original, documento.contenido);
    try {
      return await this.registrar({ operador, opciones, recibido, documento, rutas });
    } catch (error) {
      await almacenamiento.eliminar(rutas.original);
      throw error;
    }
  }

  private async registrar({ operador, opciones, recibido, documento, rutas }: Registro): Promise<DocumentoGuardado> {
    const huella = sha256(documento.contenido);
    const archivo = await this.dependencias.repositorio.guardar({
      empresaId: operador.empresaId,
      clase: 'documento',
      rutaOriginal: rutas.original,
      rutaMiniatura: null,
      tipoMime: documento.tipoMime,
      tamanoBytes: documento.contenido.length,
      ancho: documento.ancho,
      alto: documento.alto,
      sha256: huella,
      sha256Recibido: sha256(recibido),
      paginas: documento.paginas,
      recursoDueno: opciones.recursoDueno,
      nombreOriginal: opciones.nombre?.slice(0, LARGO_MAXIMO_DEL_NOMBRE) ?? null,
      subidoPor: operador.usuarioId,
    });
    const { id, tipoMime, tamanoBytes, paginas } = archivo;
    return { id, tipoMime, sha256: huella, tamanoBytes, paginas };
  }

  async abrir(archivoId: string, recursoDueno: string): Promise<DocumentoAbierto> {
    const { repositorio, almacenamiento } = this.dependencias;
    const archivo = await repositorio.buscarDocumento(archivoId, recursoDueno);
    if (!archivo) throw new RecursoNoEncontrado('El archivo');
    try {
      const contenido = await almacenamiento.leer(archivo.rutaOriginal);
      return { tipoMime: archivo.tipoMime, tamanoBytes: archivo.tamanoBytes, contenido };
    } catch {
      throw new RecursoNoEncontrado('El archivo');
    }
  }

  async eliminar(archivoId: string, recursoDueno: string): Promise<void> {
    const { repositorio, almacenamiento } = this.dependencias;
    const archivo = await repositorio.buscarDocumento(archivoId, recursoDueno);
    if (!archivo) throw new RecursoNoEncontrado('El archivo');
    await repositorio.eliminar(archivo.id);
    await almacenamiento.eliminar(archivo.rutaOriginal);
  }

  private preparar(contenido: Buffer): Promise<DocumentoPreparado> {
    return esPdfPorFirma(contenido) ? this.prepararPdf(contenido) : this.prepararFoto(contenido);
  }

  private async prepararPdf(contenido: Buffer): Promise<DocumentoPreparado> {
    if (contenido.length > LIMITE_DE_BYTES_DE_PDF)
      throw new DocumentoDemasiadoGrande(LIMITE_DE_BYTES_DE_PDF / MEGABYTE);
    const { contenido: limpio, paginas } = await this.dependencias.inspector.inspeccionar(contenido);
    return { contenido: limpio, tipoMime: 'application/pdf', extension: 'pdf', paginas, ancho: null, alto: null };
  }

  private async prepararFoto(contenido: Buffer): Promise<DocumentoPreparado> {
    const limite = LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO;
    if (contenido.length > limite) throw new DocumentoDemasiadoGrande(limite / MEGABYTE);
    try {
      const { original } = await this.dependencias.optimizador.optimizar(contenido, MEDIDAS_DE_FOTO);
      const { ancho, alto } = original;
      return { contenido: original.contenido, tipoMime: 'image/webp', extension: 'webp', paginas: null, ancho, alto };
    } catch (error) {
      throw error instanceof FormatoDeImagenNoAceptado ? new DocumentoNoAceptado() : error;
    }
  }
}
