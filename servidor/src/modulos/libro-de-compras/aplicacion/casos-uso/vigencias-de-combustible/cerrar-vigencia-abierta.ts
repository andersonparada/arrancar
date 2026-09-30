import type { VigenciaDeCombustible } from '../../../dominio/vigencia-de-combustible.js';
import type { RepositorioVigenciasDeCombustible } from '../../puertos/repositorio-vigencias-de-combustible.js';

/**
 * Una tasa nueva sin fecha de cierre reemplaza a la que regía: cierra la abierta el día anterior a su inicio.
 * Solo si la nueva empieza después que la abierta; si no, se guarda tal cual y la base rechaza el traslape.
 * Debe llamarse con el combustible ya bloqueado.
 * @throws VigenciaDeCombustibleEnUso si documentos usaron la abierta después de ese día.
 */
export async function cerrarVigenciaAbierta(
  repositorio: RepositorioVigenciasDeCombustible,
  nueva: VigenciaDeCombustible,
): Promise<void> {
  if (!nueva.estaAbierta()) return;
  const { combustibleId, vigenteDesde } = nueva.instantanea();
  const abierta = await repositorio.buscarAbierta(combustibleId);
  if (!abierta || abierta.instantanea().vigenteDesde >= vigenteDesde) return;
  abierta.cerrarAntesDe(vigenteDesde, await repositorio.enUso(abierta.id));
  await repositorio.guardar(abierta);
}
