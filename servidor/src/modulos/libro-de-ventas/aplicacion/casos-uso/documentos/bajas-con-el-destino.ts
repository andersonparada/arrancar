import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { DestinoDeDocumentoDeVenta } from '../../../../core/contratos/libro-de-ventas.contratos.js';
import { exigirQueLasNotasDeCreditoSigaCabiendo } from '../../../dominio/baja-de-documento.js';
import { DestinoInactivo } from '../../../dominio/errores-de-baja.js';
import type {
  DestinosDeVenta,
  DocumentoGuardadoDeVenta,
  RepositorioDeDocumentosDeVenta,
} from '../../puertos/puertos-de-documentos.js';

const NOMBRES_DE_DESTINO: Record<DestinoDeDocumentoDeVenta, string> = {
  'cuentas-por-cobrar': 'Cuentas por cobrar',
};

/**
 * Los avisos no llegan a un módulo desactivado, y la llave del destino impediría eliminar; para que ninguna baja deje
 * al destino sin enterarse, el documento solo se da de baja si su destino está activo.
 * @throws DestinoInactivo
 */
async function exigirDestinoActivo(destinos: DestinosDeVenta, operador: Operador, destino: DestinoDeDocumentoDeVenta) {
  if (!(await destinos.activos(operador)).includes(destino)) throw new DestinoInactivo(NOMBRES_DE_DESTINO[destino]);
}

/** Avisa a la cartera que el documento se va a anular (`documento_por_anular`); sin destino no hay a quién avisar. */
export async function avisarAnulacion(
  destinos: DestinosDeVenta,
  operador: Operador,
  aviso: { documentoId: string; destino: DestinoDeDocumentoDeVenta | null; motivo: string },
): Promise<void> {
  const { destino, ...resto } = aviso;
  if (!destino) return;
  await exigirDestinoActivo(destinos, operador, destino);
  await destinos.avisarPorAnular(operador, { ...resto, destino });
}

/** Avisa a la cartera que el documento se va a eliminar (`documento_por_eliminar`). */
export async function avisarEliminacion(
  destinos: DestinosDeVenta,
  operador: Operador,
  aviso: { documentoId: string; destino: DestinoDeDocumentoDeVenta | null },
): Promise<void> {
  const { destino, documentoId } = aviso;
  if (!destino) return;
  await exigirDestinoActivo(destinos, operador, destino);
  await destinos.avisarPorEliminar(operador, { documentoId, destino });
}

/**
 * Anular o eliminar una nota de débito: las notas de crédito de su factura deben seguir cabiendo sin ella. Toma la
 * factura con `for update`, así una nota de crédito en curso espera.
 * @throws NotaDeDebitoSostieneNotasDeCredito
 */
export async function exigirQueLasNotasSigaCabiendo(
  repositorio: Pick<RepositorioDeDocumentosDeVenta, 'facturaConNotas'>,
  guardado: DocumentoGuardadoDeVenta,
): Promise<void> {
  const { ficha } = guardado;
  if (ficha.tipo !== 'nota_de_debito' || !ficha.documentoAfectadoId) return;
  const factura = await repositorio.facturaConNotas(ficha.documentoAfectadoId, true);
  if (!factura) return;
  const nota = { total: aCentavos(ficha.totales.total), iva: aCentavos(ficha.totales.iva) };
  exigirQueLasNotasDeCreditoSigaCabiendo(factura, nota);
}
