import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { ReglaDeBaja } from '../../../dominio/reglas-de-baja.js';
import { DESTINO_PROPIO } from '../../../dominio/tipos-de-documento.js';
import { dtoDeFicha } from '../../dto/ficha-del-documento.dto.js';
import type { RepositorioDeAplicaciones, RepositorioDeDocumentos } from '../../puertos/puertos-de-documentos.js';
import { deshacerAplicaciones, revisarReglasDeBaja } from './preparar-la-baja.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  documentos: RepositorioDeDocumentos;
  aplicaciones: RepositorioDeAplicaciones;
  auditoria: Auditoria;
  reglas: readonly ReglaDeBaja[];
}

/** Lo que trae el aviso `libro-de-compras.documento_por_eliminar`. */
export interface AvisoDeEliminacion {
  /** El id del documento en Libro de compras. */
  documentoId: string;
  destino: string;
}

/**
 * Responde al aviso `libro-de-compras.documento_por_eliminar`, que llega dentro de la transacción de Libro de compras
 * antes de que borre su fila (la llave obliga a borrar primero la de aquí). Es idempotente: sin documento aquí, no hace
 * nada. Si las reglas de baja lo rechazan (por ejemplo, ya está autorizado), lanza su error y Libro de compras no
 * elimina. Si no, deshace las aplicaciones, lo audita con la ficha tal como estaba y borra su fila. No publica evento:
 * Libro de compras ya publica `documento_eliminado` y un documento sin autorizar no tiene provisión que revertir.
 */
export class EliminarPorAviso {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws el error de la regla de baja que lo rechace. */
  ejecutar(operador: Operador, aviso: AvisoDeEliminacion): Promise<void> {
    if (aviso.destino !== DESTINO_PROPIO) return Promise.resolve();
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, () => this.eliminar(aviso));
  }

  private async eliminar(aviso: AvisoDeEliminacion): Promise<void> {
    const { documentos, aplicaciones, auditoria, reglas } = this.dependencias;
    const guardado = await documentos.buscarPorDocumentoDeCompra(aviso.documentoId, true);
    if (!guardado) return;
    await revisarReglasDeBaja(reglas, guardado);
    const { documento } = guardado;
    await auditoria.registrar({
      recurso: 'cuentas-por-pagar.documentos',
      registroId: documento.id,
      accion: 'eliminar',
      anterior: dtoDeFicha(guardado),
    });
    await deshacerAplicaciones(aplicaciones, documento);
    await documentos.eliminar(documento.id);
  }
}
