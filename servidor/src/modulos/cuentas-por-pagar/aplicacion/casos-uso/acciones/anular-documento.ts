import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CausaDeAnulacionDeDocumento } from '../../../../core/contratos/libro-de-compras.contratos.js';
import { exigirAnulable, motivoValido } from '../../../dominio/ciclo-de-vida.js';
import { DocumentoAnulado, type DatosDeDocumentoAnulado } from '../../../dominio/eventos.js';
import { REGLAS_PARA_ANULAR, type ReglaDeBaja } from '../../../dominio/reglas-de-baja.js';
import type { DocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import { anularLoGuardado } from '../bajas/anular-lo-guardado.js';
import { revisarReglasDeBaja } from '../bajas/preparar-la-baja.js';
import { bloquear, dtosDe, etiquetaDe, filaDe, type DependenciasDeBajas } from './dependencias-de-acciones.js';

export interface PeticionDeAnulacion {
  id: string;
  causa: CausaDeAnulacionDeDocumento;
  motivo: string;
}

/**
 * Anula un documento desde Cuentas por pagar: anula también su registro en Libro de compras (no la FEL), sin pedir el
 * permiso de Libro de compras. Revisa sus reglas sin bloquear, para dar un mensaje temprano; manda la orden a Libro de
 * compras (que bloquea su fila, revisa período, notas y retenciones y no le devuelve el aviso); bloquea la fila de aquí,
 * revisa de nuevo y hace lo mismo que al recibir el aviso de Libro de compras (`anularLoGuardado`). Publica
 * `documento_anulado` al confirmar. Si Libro de compras rechaza, no cambia nada.
 */
export class AnularDocumento {
  constructor(
    private readonly dependencias: DependenciasDeBajas,
    private readonly reglas: readonly ReglaDeBaja[] = REGLAS_PARA_ANULAR,
  ) {}

  /**
   * @throws RecursoNoEncontrado si no existe.
   * @throws MotivoInvalido si falta el motivo o pasa de 300 caracteres.
   * @throws DocumentoYaAnulado, DocumentoConNotasVigentes o el error de una regla de baja si no se puede anular.
   * @throws el error de Libro de compras si rechaza la anulación (período, notas, causa...).
   */
  async ejecutar(operador: Operador, pedido: PeticionDeAnulacion): Promise<DocumentoPorPagarDto> {
    const motivo = motivoValido(pedido.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const resultado = await unidadDeTrabajo.ejecutar(operador, async () => ({
      anulado: await this.anular(operador, { ...pedido, motivo }),
      dto: (await dtosDe(this.dependencias, operador, [pedido.id]))[0]!,
    }));
    await publicadorEventos.publicar([new DocumentoAnulado(resultado.anulado)]);
    return resultado.dto;
  }

  private async anular(
    operador: Operador,
    { id, causa, motivo }: PeticionDeAnulacion,
  ): Promise<DatosDeDocumentoAnulado> {
    const { documentos, consultas, libroDeCompras } = this.dependencias;
    const { documento, origen, notasVigentes } = await filaDe(consultas, id);
    const etiqueta = etiquetaDe(origen);
    exigirAnulable(documento, notasVigentes, etiqueta);
    await revisarReglasDeBaja(this.reglas, (await documentos.buscarPorId(id, false))!);
    await libroDeCompras.anular(operador, { documentoId: documento.documentoId, causa, motivo });
    const guardado = await bloquear(documentos, id);
    exigirAnulable(guardado.documento, 0, etiqueta);
    await revisarReglasDeBaja(this.reglas, guardado);
    return anularLoGuardado(this.dependencias, operador, { guardado, motivo });
  }
}
