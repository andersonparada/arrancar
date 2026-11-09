import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DocumentoConAplicaciones } from '../../../dominio/documento-por-pagar.js';
import type { DatosDeDocumentoAnulado } from '../../../dominio/eventos.js';
import { dtoDeFicha } from '../../dto/ficha-del-documento.dto.js';
import type { RepositorioDeAplicaciones, RepositorioDeDocumentos } from '../../puertos/puertos-de-documentos.js';
import { deshacerAplicaciones } from './preparar-la-baja.js';

export interface DependenciasParaAnular {
  documentos: RepositorioDeDocumentos;
  aplicaciones: RepositorioDeAplicaciones;
  auditoria: Auditoria;
}

/**
 * Lo que sigue a las reglas de baja cuando se anula, venga el aviso de Libro de compras o la orden de aquí: deshace las
 * aplicaciones, deja el documento anulado con el motivo, lo audita con la ficha tal como estaba y devuelve los datos del
 * evento `documento_anulado`, que quien llama publica al confirmar su transacción.
 */
export async function anularLoGuardado(
  { documentos, aplicaciones, auditoria }: DependenciasParaAnular,
  operador: Operador,
  { guardado, motivo }: { guardado: DocumentoConAplicaciones; motivo: string },
): Promise<DatosDeDocumentoAnulado> {
  const { documento } = guardado;
  const estabaAutorizado = documento.estado === 'autorizado';
  await deshacerAplicaciones(aplicaciones, documento);
  await documentos.anular(documento.id, { anuladoPor: operador.usuarioId, motivo, estabaAutorizado });
  await auditoria.registrar({
    recurso: 'cuentas-por-pagar.documentos',
    registroId: documento.id,
    accion: 'anular',
    anterior: dtoDeFicha(guardado),
    motivo,
  });
  return {
    empresaId: operador.empresaId,
    documentoId: documento.id,
    documentoDeCompraId: documento.documentoId,
    origen: documento.origen,
    estabaAutorizado,
  };
}
