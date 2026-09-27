import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ArchivoGuardado,
  NuevoArchivo,
  RepositorioArchivos,
} from '../../aplicacion/puertos/repositorio-archivos.js';
import { archivos } from './archivos.tablas.js';

const columnasGuardadas = {
  id: archivos.id,
  rutaOriginal: archivos.rutaOriginal,
  rutaMiniatura: archivos.rutaMiniatura,
  tipoMime: archivos.tipoMime,
  tamanoBytes: archivos.tamanoBytes,
  ancho: archivos.ancho,
  alto: archivos.alto,
};

export class RepositorioArchivosDrizzle implements RepositorioArchivos {
  async guardar(archivo: NuevoArchivo): Promise<ArchivoGuardado> {
    const [guardado] = await transaccionEnCurso().insert(archivos).values(archivo).returning(columnasGuardadas);
    return guardado!;
  }

  async buscar(archivoId: string): Promise<ArchivoGuardado | null> {
    const [archivo] = await transaccionEnCurso()
      .select(columnasGuardadas)
      .from(archivos)
      .where(eq(archivos.id, archivoId));
    return archivo ?? null;
  }
}
