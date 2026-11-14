import { eq, sql } from 'drizzle-orm';
import { archivos } from '../../../core/archivos/infraestructura/persistencia/archivos.tablas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { EstadoDeCuentaDto } from '../../aplicacion/dto/conciliacion.dto.js';
import { conciliaciones } from './conciliaciones.tablas.js';

/** Los datos del archivo del estado de cuenta de la conciliación (nunca su ruta ni su id), o `null` si no tiene. */
export async function estadoDeCuentaDeLaConciliacion(conciliacionId: string): Promise<EstadoDeCuentaDto | null> {
  const [fila] = await transaccionEnCurso()
    .select({
      tipoMime: archivos.tipoMime,
      tamanoBytes: archivos.tamanoBytes,
      paginas: archivos.paginas,
      sha256: archivos.sha256,
      nombreOriginal: archivos.nombreOriginal,
      subidoEn: archivos.creadoEn,
      subidoPorNombre: sql<string | null>`trim(${usuarios.nombres} || ' ' || ${usuarios.apellidos})`,
    })
    .from(conciliaciones)
    .innerJoin(archivos, eq(archivos.id, conciliaciones.estadoDeCuentaArchivoId))
    .leftJoin(usuarios, eq(usuarios.id, archivos.subidoPor))
    .where(eq(conciliaciones.id, conciliacionId));
  if (!fila) return null;
  return { ...fila, sha256: fila.sha256 ?? '', subidoEn: fila.subidoEn.toISOString() };
}
