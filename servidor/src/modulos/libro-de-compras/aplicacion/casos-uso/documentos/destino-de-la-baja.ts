import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DestinoDeDocumento } from '../../../dominio/destinos-de-documento.js';
import { DestinoInactivo } from '../../../dominio/errores-de-baja.js';
import type { AvisoDeBaja, DestinosDeDocumentos } from '../../puertos/puertos-de-documentos.js';

/** Cómo se llama cada destino ante el usuario. */
const NOMBRES_DE_DESTINO: Record<DestinoDeDocumento, string> = {
  'cuentas-por-pagar': 'Cuentas por pagar',
  'caja-chica': 'Caja chica',
  'cuentas-por-liquidar': 'Cuentas por liquidar',
};

/**
 * Los avisos no llegan a un módulo desactivado, y la llave del destino impediría eliminar; para que ninguna baja deje
 * al destino sin enterarse, el documento solo se da de baja si su destino está activo.
 * @throws DestinoInactivo si el módulo de destino no está activo en la cuenta.
 */
async function exigirDestinoActivo(destinos: DestinosDeDocumentos, operador: Operador, destino: DestinoDeDocumento) {
  if (!(await destinos.activos(operador)).includes(destino)) throw new DestinoInactivo(NOMBRES_DE_DESTINO[destino]);
}

/** El aviso de una baja y, si la pidió el propio destino, cuál es (`origen`): a ese no se le devuelve el aviso. */
type BajaPedida = AvisoDeBaja & { origen?: DestinoDeDocumento };

/** Avisa al destino que el documento se va a anular; no hace nada si el destino mismo pidió la anulación. */
export async function avisarAnulacion(
  destinos: DestinosDeDocumentos,
  operador: Operador,
  { origen, ...aviso }: BajaPedida & { motivo: string },
): Promise<void> {
  if (origen === aviso.destino) return;
  await exigirDestinoActivo(destinos, operador, aviso.destino);
  await destinos.avisarPorAnular(operador, aviso);
}

/** Avisa al destino que el documento se va a eliminar; no hace nada si el destino mismo pidió la eliminación. */
export async function avisarEliminacion(
  destinos: DestinosDeDocumentos,
  operador: Operador,
  { origen, ...aviso }: BajaPedida,
): Promise<void> {
  if (origen === aviso.destino) return;
  await exigirDestinoActivo(destinos, operador, aviso.destino);
  await destinos.avisarPorEliminar(operador, aviso);
}
