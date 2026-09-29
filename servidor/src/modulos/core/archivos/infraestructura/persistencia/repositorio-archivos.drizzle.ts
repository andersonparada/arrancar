import { and, eq, isNull, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ArchivoGuardado,
  ClaseDeArchivo,
  NuevoArchivo,
  RepositorioArchivos,
} from '../../aplicacion/puertos/repositorio-archivos.js';
import { archivos } from './archivos.tablas.js';

const columnasGuardadas = {
  id: archivos.id,
  clase: archivos.clase,
  rutaOriginal: archivos.rutaOriginal,
  rutaMiniatura: archivos.rutaMiniatura,
  tipoMime: archivos.tipoMime,
  tamanoBytes: archivos.tamanoBytes,
  ancho: archivos.ancho,
  alto: archivos.alto,
  sha256: archivos.sha256,
  paginas: archivos.paginas,
  recursoDueno: archivos.recursoDueno,
};

type FilaGuardada = Omit<ArchivoGuardado, 'clase'> & { clase: string };

function aArchivo(fila: FilaGuardada): ArchivoGuardado {
  return { ...fila, clase: fila.clase as ClaseDeArchivo };
}

export class RepositorioArchivosDrizzle implements RepositorioArchivos {
  async guardar(archivo: NuevoArchivo): Promise<ArchivoGuardado> {
    const [guardado] = await transaccionEnCurso().insert(archivos).values(archivo).returning(columnasGuardadas);
    return aArchivo(guardado!);
  }

  async buscarImagenLibre(archivoId: string): Promise<ArchivoGuardado | null> {
    return this.buscar(and(eq(archivos.id, archivoId), eq(archivos.clase, 'imagen'), isNull(archivos.recursoDueno)));
  }

  async buscarDocumento(archivoId: string, recursoDueno: string): Promise<ArchivoGuardado | null> {
    return this.buscar(
      and(eq(archivos.id, archivoId), eq(archivos.clase, 'documento'), eq(archivos.recursoDueno, recursoDueno)),
    );
  }

  async eliminar(archivoId: string): Promise<void> {
    await transaccionEnCurso().delete(archivos).where(eq(archivos.id, archivoId));
  }

  private async buscar(condicion: SQL | undefined): Promise<ArchivoGuardado | null> {
    const [fila] = await transaccionEnCurso().select(columnasGuardadas).from(archivos).where(condicion);
    return fila ? aArchivo(fila) : null;
  }
}
