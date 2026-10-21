import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { DocumentoAnulado, type DatosDeDocumentoAnulado } from '../../../dominio/eventos.js';
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
  /** Corre dentro de la transacción de Libro de compras: sus eventos deben esperar a que se confirme. */
  publicadorEventos: PublicadorEventos;
  reglas: readonly ReglaDeBaja[];
}

/** Lo que trae el aviso `libro-de-compras.documento_por_anular`. */
export interface AvisoDeAnulacion {
  /** El id del documento en Libro de compras. */
  documentoId: string;
  destino: string;
  motivo: string;
}

/**
 * Responde al aviso `libro-de-compras.documento_por_anular`, que llega dentro de la transacción de Libro de compras antes
 * de que anule nada. Es idempotente: sin documento aquí, o ya anulado, no hace nada. Si las reglas de baja lo rechazan,
 * lanza su error y Libro de compras no anula. Si no, deshace las aplicaciones de notas, lo deja anulado con el motivo,
 * lo audita con la ficha tal como estaba y, tras confirmar la transacción de quien avisa, publica `documento_anulado`
 * (con `estabaAutorizado`, para que Contabilidad revierta la provisión).
 */
export class AnularPorAviso {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws el error de la regla de baja que lo rechace. */
  async ejecutar(operador: Operador, aviso: AvisoDeAnulacion): Promise<void> {
    if (aviso.destino !== DESTINO_PROPIO) return;
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const anulado = await unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, aviso));
    if (anulado) await publicadorEventos.publicar([new DocumentoAnulado(anulado)]);
  }

  private async anular(operador: Operador, aviso: AvisoDeAnulacion): Promise<DatosDeDocumentoAnulado | null> {
    const { documentos, aplicaciones, auditoria, reglas } = this.dependencias;
    const guardado = await documentos.buscarPorDocumentoDeCompra(aviso.documentoId, true);
    if (!guardado || guardado.documento.estado === 'anulado') return null;
    await revisarReglasDeBaja(reglas, guardado);
    const { documento } = guardado;
    const estabaAutorizado = documento.estado === 'autorizado';
    await deshacerAplicaciones(aplicaciones, documento);
    await documentos.anular(documento.id, { anuladoPor: operador.usuarioId, motivo: aviso.motivo, estabaAutorizado });
    await auditoria.registrar({
      recurso: 'cuentas-por-pagar.documentos',
      registroId: documento.id,
      accion: 'anular',
      anterior: dtoDeFicha(guardado),
      motivo: aviso.motivo,
    });
    return {
      empresaId: operador.empresaId,
      documentoId: documento.id,
      documentoDeCompraId: documento.documentoId,
      estabaAutorizado,
    };
  }
}
