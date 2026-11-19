import { eq } from 'drizzle-orm';
import { archivos } from '../../../core/archivos/infraestructura/persistencia/archivos.tablas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { EvidenciaDto } from '../../aplicacion/dto/saldo-inicial.dto.js';
import { aDatosDelArchivo, columnasDelArchivo } from './estado-de-cuenta.consulta.drizzle.js';
import { saldosIniciales } from './saldos-iniciales.tablas.js';

/** El id del archivo de la evidencia de la cuenta, o `null` si no tiene saldo inicial o no subió evidencia. */
export async function archivoDeLaEvidenciaDe(cuentaBancariaId: string): Promise<string | null> {
  const [fila] = await transaccionEnCurso()
    .select({ archivoId: saldosIniciales.evidenciaArchivoId })
    .from(saldosIniciales)
    .where(eq(saldosIniciales.cuentaBancariaId, cuentaBancariaId));
  return fila?.archivoId ?? null;
}

/** Los datos del archivo de la evidencia (nunca su ruta ni su id), o `null` si no tiene. */
export async function evidenciaDeLaCuenta(cuentaBancariaId: string): Promise<EvidenciaDto | null> {
  const [fila] = await transaccionEnCurso()
    .select(columnasDelArchivo)
    .from(saldosIniciales)
    .innerJoin(archivos, eq(archivos.id, saldosIniciales.evidenciaArchivoId))
    .leftJoin(usuarios, eq(usuarios.id, archivos.subidoPor))
    .where(eq(saldosIniciales.cuentaBancariaId, cuentaBancariaId));
  return fila ? aDatosDelArchivo(fila) : null;
}
