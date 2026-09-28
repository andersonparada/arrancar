import { bd, type Transaccion } from '../../base-datos/conexion.js';
import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import { transaccionEnCurso, UnidadDeTrabajoPostgres } from '../infraestructura/unidad-de-trabajo-postgres.js';

const unidadDeTrabajo = new UnidadDeTrabajoPostgres(bd);

/**
 * Para las pruebas de aislamiento: corre la consulta en una unidad de trabajo
 * real, con las variables de seguridad del contexto, igual que un caso de uso.
 */
export function enTransaccionSegura<Resultado>(
  contexto: ContextoEmpresa,
  consulta: (tx: Transaccion) => Promise<Resultado>,
): Promise<Resultado> {
  return unidadDeTrabajo.ejecutar(contexto, () => consulta(transaccionEnCurso()));
}
