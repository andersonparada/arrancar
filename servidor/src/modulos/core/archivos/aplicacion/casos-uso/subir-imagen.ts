import type { Almacenamiento } from '../../../compartido/aplicacion/almacenamiento.js';
import type { ImagenSubida } from '../../../compartido/aplicacion/imagen-subida.js';
import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import { exigirFormatoAceptado } from '../../dominio/imagen.js';
import { RutasDeImagen } from '../../dominio/rutas-de-imagen.js';
import type { ArchivoDto } from '../dto/archivo.dto.js';
import type { ImagenOptimizada, OptimizadorDeImagenes } from '../puertos/optimizador-de-imagenes.js';
import type { ArchivoGuardado, RepositorioArchivos } from '../puertos/repositorio-archivos.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioArchivos;
  almacenamiento: Almacenamiento;
  optimizador: OptimizadorDeImagenes;
}

interface ImagenGuardada {
  imagen: ImagenSubida;
  original: ImagenOptimizada;
  rutas: RutasDeImagen;
}

const MEDIDA_ORIGINAL = { ladoMaximo: 1600, calidad: 80 };
const MEDIDA_MINIATURA = { ladoMaximo: 400, calidad: 70 };
const LARGO_MAXIMO_DEL_NOMBRE = 200;

/**
 * Guarda una foto de la empresa en dos tamaños (normal y miniatura). Las fotos de
 * celular (4–8 MB) quedan en unos 150–300 KB.
 */
export class SubirImagen {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws FormatoDeImagenNoAceptado o ImagenIlegible si no es una imagen válida. */
  async ejecutar(operador: Operador, imagen: ImagenSubida): Promise<ArchivoDto> {
    exigirFormatoAceptado(imagen.tipoMime);
    const { optimizador } = this.dependencias;
    const [original, miniatura] = await Promise.all([
      optimizador.optimizar(imagen.contenido, MEDIDA_ORIGINAL),
      optimizador.optimizar(imagen.contenido, MEDIDA_MINIATURA),
    ]);
    const rutas = RutasDeImagen.nuevas(operador.empresaId, new Date(), crypto.randomUUID());
    await this.dependencias.almacenamiento.guardar(rutas.original, original.contenido);
    await this.dependencias.almacenamiento.guardar(rutas.miniatura, miniatura.contenido);
    const archivo = await this.registrar(operador, { imagen, original, rutas });
    return { id: archivo.id, ancho: archivo.ancho, alto: archivo.alto, tamanoBytes: archivo.tamanoBytes };
  }

  private registrar(operador: Operador, { imagen, original, rutas }: ImagenGuardada): Promise<ArchivoGuardado> {
    const { unidadDeTrabajo, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () =>
      repositorio.guardar({
        empresaId: operador.empresaId,
        rutaOriginal: rutas.original,
        rutaMiniatura: rutas.miniatura,
        tipoMime: 'image/webp',
        tamanoBytes: original.contenido.length,
        ancho: original.ancho,
        alto: original.alto,
        nombreOriginal: imagen.nombreOriginal?.slice(0, LARGO_MAXIMO_DEL_NOMBRE) ?? null,
        subidoPor: operador.usuarioId,
      }),
    );
  }
}
