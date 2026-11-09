import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { exigirAutorizado, motivoValido } from '../../../dominio/ciclo-de-vida.js';
import { DocumentoDesautorizado } from '../../../dominio/eventos.js';
import { REGLAS_PARA_DESAUTORIZAR, type ReglaDeBaja } from '../../../dominio/reglas-de-baja.js';
import type { DocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import { dtoDeFicha } from '../../dto/ficha-del-documento.dto.js';
import { revisarReglasDeBaja } from '../bajas/preparar-la-baja.js';
import { bloquear, dtosDe, etiquetaDe, filaDe, type DependenciasDeAutorizacion } from './dependencias-de-acciones.js';

/**
 * Desautoriza un documento (U5): `autorizado` vuelve a `registrado` y Libro de compras lo deja de nuevo eliminable.
 * Exige un motivo, lo audita como `devolver` con la ficha tal como estaba y publica `documento_desautorizado` al
 * confirmar. Las reglas (los pagos, en CP4) pueden rechazarlo.
 */
export class DesautorizarDocumento {
  constructor(
    private readonly dependencias: DependenciasDeAutorizacion,
    private readonly reglas: readonly ReglaDeBaja[] = REGLAS_PARA_DESAUTORIZAR,
  ) {}

  /**
   * @throws RecursoNoEncontrado si no existe.
   * @throws MotivoInvalido si falta el motivo o pasa de 300 caracteres.
   * @throws DocumentoNoAutorizado si no está autorizado.
   */
  async ejecutar(operador: Operador, pedido: { id: string; motivo: string }): Promise<DocumentoPorPagarDto> {
    const motivo = motivoValido(pedido.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const resultado = await unidadDeTrabajo.ejecutar(operador, async () => ({
      evento: await this.desautorizar(operador, pedido.id, motivo),
      dto: (await dtosDe(this.dependencias, operador, [pedido.id]))[0]!,
    }));
    await publicadorEventos.publicar([resultado.evento]);
    return resultado.dto;
  }

  private async desautorizar(operador: Operador, id: string, motivo: string): Promise<DocumentoDesautorizado> {
    const { documentos, consultas, libroDeCompras, auditoria } = this.dependencias;
    const { documento: previo } = await filaDe(consultas, id);
    const etiqueta = etiquetaDe(previo);
    exigirAutorizado(previo, etiqueta);
    if (previo.documentoId !== null) await libroDeCompras.marcarProcesado(operador, previo.documentoId, false);
    const guardado = await bloquear(documentos, id);
    exigirAutorizado(guardado.documento, etiqueta);
    await revisarReglasDeBaja(this.reglas, guardado);
    await documentos.desautorizar(id);
    await auditoria.registrar({
      recurso: 'cuentas-por-pagar.documentos',
      registroId: id,
      accion: 'devolver',
      anterior: dtoDeFicha(guardado),
      motivo,
    });
    return new DocumentoDesautorizado({
      empresaId: operador.empresaId,
      documentoId: id,
      documentoDeCompraId: guardado.documento.documentoId,
      origen: guardado.documento.origen,
    });
  }
}
