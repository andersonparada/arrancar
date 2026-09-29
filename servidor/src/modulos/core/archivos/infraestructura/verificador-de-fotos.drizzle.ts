import { and, eq, isNull } from 'drizzle-orm';
import { FotoNoValida, type VerificadorDeFotos } from '../../compartido/aplicacion/verificador-de-fotos.js';
import { transaccionEnCurso } from '../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { archivos } from './persistencia/archivos.tablas.js';

/** Busca la foto con RLS de la empresa activa: solo cuenta una imagen sin dueño. */
export class VerificadorDeFotosDrizzle implements VerificadorDeFotos {
  async exigir(archivoId: string | null): Promise<void> {
    if (archivoId === null) return;
    const condicion = and(eq(archivos.id, archivoId), eq(archivos.clase, 'imagen'), isNull(archivos.recursoDueno));
    const [fila] = await transaccionEnCurso().select({ id: archivos.id }).from(archivos).where(condicion);
    if (!fila) throw new FotoNoValida();
  }
}
