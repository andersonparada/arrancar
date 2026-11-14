import { exigirAlMenosUnCargo } from '../../../dominio/reglas-de-contrasena.js';
import { leerDocumentos, repartirNotas, type DependenciasDeLosDocumentos } from './documentos-de-la-contrasena.js';

export interface DatosDelReparto {
  contrasenaId: string;
  proveedorId: string;
  /** La fecha de la contraseña. */
  fecha: string;
  fechaDeInicio: string | null;
  /** Los documentos que quedan en la contraseña, ya con los cambios hechos. */
  documentoIds: readonly string[];
}

/**
 * Deshace lo que las notas de la contraseña rebajaron y lo reparte de nuevo con los documentos que quedan. Como la
 * fecha de cada aplicación sale de la contraseña y de las recepciones, las notas que no cambian conservan su fecha.
 * Los documentos ya deben estar bloqueados.
 * @throws ContrasenaSinCargos si ya no queda ningún cargo.
 * @throws ContrasenaSinSaldo si las notas cubren todo lo que se debe.
 */
export async function rehacerElReparto(
  dependencias: DependenciasDeLosDocumentos,
  { contrasenaId, proveedorId, fecha, fechaDeInicio, documentoIds }: DatosDelReparto,
): Promise<void> {
  await dependencias.repositorio.borrarReparto(contrasenaId);
  const filas = await leerDocumentos(dependencias, documentoIds);
  exigirAlMenosUnCargo(filas.map(({ documento }) => documento));
  const reparto = await repartirNotas(dependencias, { fecha, filas, fechaDeInicio });
  await dependencias.repositorio.guardarReparto(contrasenaId, proveedorId, reparto.aplicaciones);
}
