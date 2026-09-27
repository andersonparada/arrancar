import type { Almacenamiento } from '../../../compartido/aplicacion/almacenamiento.js';
import { RecursoNoEncontrado } from '../../../compartido/aplicacion/errores.js';
import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import type { VarianteDeImagen } from '../../dominio/imagen.js';
import type { ImagenAbierta } from '../dto/archivo.dto.js';
import type { RepositorioArchivos } from '../puertos/repositorio-archivos.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioArchivos;
  almacenamiento: Almacenamiento;
}

export interface ImagenPedida {
  archivoId: string;
  variante: VarianteDeImagen;
}

/** El contenido de una imagen de la empresa activa, en el tamaño pedido. */
export class AbrirImagen {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si no existe, es de otra empresa o falta en el almacenamiento. */
  async ejecutar(operador: Operador, { archivoId, variante }: ImagenPedida): Promise<ImagenAbierta> {
    const { unidadDeTrabajo, repositorio, almacenamiento } = this.dependencias;
    const archivo = await unidadDeTrabajo.ejecutar(operador, () => repositorio.buscar(archivoId));
    if (!archivo) throw new RecursoNoEncontrado('El archivo');
    const ruta = variante === 'miniatura' ? archivo.rutaMiniatura : archivo.rutaOriginal;
    try {
      return { tipoMime: archivo.tipoMime, contenido: await almacenamiento.leer(ruta) };
    } catch {
      throw new RecursoNoEncontrado('El archivo');
    }
  }
}
