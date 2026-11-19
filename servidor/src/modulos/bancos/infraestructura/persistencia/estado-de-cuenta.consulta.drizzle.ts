import { eq, sql } from 'drizzle-orm';
import { archivos } from '../../../core/archivos/infraestructura/persistencia/archivos.tablas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { EstadoDeCuentaDto } from '../../aplicacion/dto/conciliacion.dto.js';
import { conciliaciones } from './conciliaciones.tablas.js';

/** Las columnas de los datos de un archivo adjunto (nunca su ruta ni su id). */
export const columnasDelArchivo = {
  tipoMime: archivos.tipoMime,
  tamanoBytes: archivos.tamanoBytes,
  paginas: archivos.paginas,
  sha256: sql<string | null>`coalesce(${archivos.sha256Recibido}, ${archivos.sha256})`,
  nombreOriginal: archivos.nombreOriginal,
  subidoEn: archivos.creadoEn,
  subidoPorNombre: sql<string | null>`trim(${usuarios.nombres} || ' ' || ${usuarios.apellidos})`,
};

type FilaDeArchivo = Omit<EstadoDeCuentaDto, 'sha256' | 'subidoEn'> & { sha256: string | null; subidoEn: Date };

/** Pasa la fila de la base al DTO: la huella siempre es texto y la fecha viaja en ISO. */
export function aDatosDelArchivo(fila: FilaDeArchivo): EstadoDeCuentaDto {
  return { ...fila, sha256: fila.sha256 ?? '', subidoEn: fila.subidoEn.toISOString() };
}

/** Los datos del archivo del estado de cuenta de la conciliación, o `null` si no tiene. */
export async function estadoDeCuentaDeLaConciliacion(conciliacionId: string): Promise<EstadoDeCuentaDto | null> {
  const [fila] = await transaccionEnCurso()
    .select(columnasDelArchivo)
    .from(conciliaciones)
    .innerJoin(archivos, eq(archivos.id, conciliaciones.estadoDeCuentaArchivoId))
    .leftJoin(usuarios, eq(usuarios.id, archivos.subidoPor))
    .where(eq(conciliaciones.id, conciliacionId));
  return fila ? aDatosDelArchivo(fila) : null;
}
