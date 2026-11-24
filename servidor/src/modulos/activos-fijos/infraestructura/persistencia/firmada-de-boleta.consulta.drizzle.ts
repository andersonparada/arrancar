import { eq, sql } from 'drizzle-orm';
import { archivos } from '../../../core/archivos/infraestructura/persistencia/archivos.tablas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { BoletaFirmadaDto } from '../../aplicacion/dto/traslado.dto.js';
import { boletasFirmadas } from './boletas-firmadas.tablas.js';

/** Las columnas de los datos del archivo (nunca su ruta ni su id). */
const columnasDelArchivo = {
  tipoMime: archivos.tipoMime,
  tamanoBytes: archivos.tamanoBytes,
  paginas: archivos.paginas,
  sha256: sql<string | null>`coalesce(${archivos.sha256Recibido}, ${archivos.sha256})`,
  nombreOriginal: archivos.nombreOriginal,
  subidoEn: archivos.creadoEn,
  subidoPorNombre: sql<string | null>`trim(${usuarios.nombres} || ' ' || ${usuarios.apellidos})`,
};

/** Los datos del escaneo firmado de la boleta, o `null` si todavía no se sube. */
export async function firmadaDeLaBoleta(grupoId: string): Promise<BoletaFirmadaDto | null> {
  const [fila] = await transaccionEnCurso()
    .select(columnasDelArchivo)
    .from(boletasFirmadas)
    .innerJoin(archivos, eq(archivos.id, boletasFirmadas.archivoId))
    .leftJoin(usuarios, eq(usuarios.id, archivos.subidoPor))
    .where(eq(boletasFirmadas.grupoId, grupoId));
  return fila ? { ...fila, sha256: fila.sha256 ?? '', subidoEn: fila.subidoEn.toISOString() } : null;
}
