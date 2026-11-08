import type { Almacenamiento } from '../../compartido/aplicacion/almacenamiento.js';
import type {
  DocumentoAbierto,
  DocumentoGuardado,
  DocumentoRevisado,
  DocumentosProtegidos,
  OpcionesDeDocumento,
} from '../../compartido/aplicacion/documentos-protegidos.js';
import { RecursoNoEncontrado } from '../../compartido/aplicacion/errores.js';
import type { Operador } from '../../compartido/aplicacion/operador.js';
import type { TareasDeLaTransaccion } from '../../compartido/aplicacion/tareas-de-la-transaccion.js';
import { RutasDeArchivo } from '../dominio/rutas-de-archivo.js';
import { PreparadorDeDocumentos, sha256, type DocumentoPreparado } from './preparador-de-documentos.js';
import type { InspectorDePdf } from './puertos/inspector-de-pdf.js';
import type { OptimizadorDeImagenes } from './puertos/optimizador-de-imagenes.js';
import type { NuevoArchivo, RepositorioArchivos } from './puertos/repositorio-archivos.js';

interface Dependencias {
  repositorio: RepositorioArchivos;
  almacenamiento: Almacenamiento;
  optimizador: OptimizadorDeImagenes;
  inspector: InspectorDePdf;
  tareas: TareasDeLaTransaccion;
}

interface Registro {
  operador: Operador;
  opciones: OpcionesDeDocumento;
  revisado: Revisado;
  ruta: string;
}

function aNuevoArchivo({ operador, opciones, revisado, ruta }: Registro): NuevoArchivo {
  return {
    empresaId: operador.empresaId,
    clase: 'documento',
    rutaOriginal: ruta,
    rutaMiniatura: null,
    tipoMime: revisado.tipoMime,
    tamanoBytes: revisado.contenido.length,
    ancho: revisado.ancho,
    alto: revisado.alto,
    sha256: sha256(revisado.contenido),
    sha256Recibido: revisado.sha256Recibido,
    paginas: revisado.paginas,
    recursoDueno: opciones.recursoDueno,
    nombreOriginal: revisado.nombreOriginal,
    subidoPor: operador.usuarioId,
  };
}

const LARGO_MAXIMO_DEL_NOMBRE = 200;

/** Por dentro, el documento revisado lleva también el nombre con el que llegó; el módulo dueño no lo ve. */
type Revisado = DocumentoPreparado & { nombreOriginal: string | null };

/** Guarda documentos revisados: los PDF pasan por el inspector y las fotos por el optimizador. */
export class GestorDeDocumentos implements DocumentosProtegidos {
  private readonly preparador: PreparadorDeDocumentos;

  constructor(private readonly dependencias: Dependencias) {
    this.preparador = new PreparadorDeDocumentos(dependencias.inspector, dependencias.optimizador);
  }

  async revisar(contenido: Buffer, nombre: string | null): Promise<DocumentoRevisado> {
    const preparado = await this.preparador.preparar(contenido);
    const revisado: Revisado = { ...preparado, nombreOriginal: nombre?.slice(0, LARGO_MAXIMO_DEL_NOMBRE) ?? null };
    return revisado as unknown as DocumentoRevisado;
  }

  async guardar(operador: Operador, contenido: Buffer, opciones: OpcionesDeDocumento): Promise<DocumentoGuardado> {
    return this.guardarRevisado(operador, await this.revisar(contenido, opciones.nombre), opciones);
  }

  async guardarRevisado(
    operador: Operador,
    documento: DocumentoRevisado,
    opciones: OpcionesDeDocumento,
  ): Promise<DocumentoGuardado> {
    const revisado = documento as unknown as Revisado;
    const nombre = `${crypto.randomUUID()}.${revisado.extension}`;
    const ruta = RutasDeArchivo.deDocumento(operador.empresaId, new Date(), nombre).original;
    const { almacenamiento, tareas } = this.dependencias;
    await almacenamiento.guardar(ruta, revisado.contenido);
    tareas.siSeDeshace(() => almacenamiento.eliminar(ruta));
    try {
      return await this.registrar(aNuevoArchivo({ operador, opciones, revisado, ruta }));
    } catch (error) {
      await almacenamiento.eliminar(ruta);
      throw error;
    }
  }

  private async registrar(nuevo: NuevoArchivo): Promise<DocumentoGuardado> {
    const { id, tipoMime, tamanoBytes, paginas } = await this.dependencias.repositorio.guardar(nuevo);
    return { id, tipoMime, sha256: nuevo.sha256!, tamanoBytes, paginas };
  }

  async abrir(archivoId: string, recursoDueno: string): Promise<DocumentoAbierto> {
    const { repositorio, almacenamiento } = this.dependencias;
    const archivo = await repositorio.buscarDocumento(archivoId, recursoDueno);
    if (!archivo) throw new RecursoNoEncontrado('El archivo');
    try {
      const contenido = await almacenamiento.leer(archivo.rutaOriginal);
      const { tipoMime, tamanoBytes, sha256, creadoEn } = archivo;
      return { tipoMime, tamanoBytes, sha256, creadoEn, contenido };
    } catch {
      throw new RecursoNoEncontrado('El archivo');
    }
  }

  async eliminar(archivoId: string, recursoDueno: string): Promise<void> {
    const { repositorio, almacenamiento, tareas } = this.dependencias;
    const archivo = await repositorio.buscarDocumento(archivoId, recursoDueno);
    if (!archivo) throw new RecursoNoEncontrado('El archivo');
    await repositorio.eliminar(archivo.id);
    await tareas.despuesDeConfirmar(() => almacenamiento.eliminar(archivo.rutaOriginal));
  }
}
