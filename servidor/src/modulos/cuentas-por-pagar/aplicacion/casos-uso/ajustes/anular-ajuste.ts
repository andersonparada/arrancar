import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { EFECTO_DE_LA_CAUSA, type AjusteDeSaldo } from '../../../dominio/ajustes.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import { AjusteYaAnulado } from '../../../dominio/errores-de-ajustes.js';
import { AjusteAnulado } from '../../../dominio/eventos-de-ajustes.js';
import type { FichaDelDocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import { ajusteDto } from '../../dto/ficha-del-documento.dto.js';
import { bloquear } from '../acciones/dependencias-de-acciones.js';
import { fichaDeLaNota, RECURSO_DE_AJUSTES, type DependenciasDeAjustes } from './dependencias-de-ajustes.js';

export interface PeticionParaAnularAjuste {
  ajusteId: string;
  motivo: string;
}

/**
 * Anula un ajuste vigente: el saldo libre vuelve a la nota. Bloquea la nota, audita `anular` con el ajuste como estaba
 * y publica `ajuste_anulado` (con la fecha de hoy) al confirmar.
 */
export class AnularAjuste {
  constructor(private readonly dependencias: DependenciasDeAjustes) {}

  /**
   * @throws MotivoInvalido si falta el motivo o pasa de 300 caracteres.
   * @throws RecursoNoEncontrado si el ajuste no existe.
   * @throws AjusteYaAnulado si ya estaba anulado.
   */
  async ejecutar(operador: Operador, pedido: PeticionParaAnularAjuste): Promise<FichaDelDocumentoPorPagarDto> {
    const motivo = motivoValido(pedido.motivo);
    const { unidadDeTrabajo, publicadorEventos, cargaInicial } = this.dependencias;
    const resultado = await unidadDeTrabajo.ejecutar(operador, async () => {
      const { fechaDeInicio } = await cargaInicial.obtener(operador);
      const { evento, notaId } = await this.anular(operador, pedido.ajusteId, motivo);
      return { evento, ficha: await fichaDeLaNota(this.dependencias, operador, { notaId, fechaDeInicio }) };
    });
    await publicadorEventos.publicar([resultado.evento]);
    return resultado.ficha;
  }

  private async anular(operador: Operador, ajusteId: string, motivo: string) {
    const { documentos, ajustes, auditoria, reloj } = this.dependencias;
    const previo = await this.buscar(ajusteId);
    await bloquear(documentos, previo.documentoId);
    const ajuste = await this.buscar(ajusteId);
    if (ajuste.estado !== 'vigente') throw new AjusteYaAnulado();
    await auditoria.registrar({
      recurso: RECURSO_DE_AJUSTES,
      registroId: ajusteId,
      accion: 'anular',
      anterior: ajusteDto(ajuste),
      motivo,
    });
    await ajustes.anular(ajusteId, { anuladoPor: operador.usuarioId, motivo });
    const evento = new AjusteAnulado({
      empresaId: operador.empresaId,
      ajusteId,
      documentoId: ajuste.documentoId,
      fecha: await reloj.hoy(operador),
      montoCentavos: ajuste.montoCentavos,
      efecto: EFECTO_DE_LA_CAUSA[ajuste.causa],
    });
    return { evento, notaId: ajuste.documentoId };
  }

  /** El ajuste; se vuelve a leer ya con la nota bloqueada por si otra petición lo anuló. */
  private async buscar(ajusteId: string): Promise<AjusteDeSaldo> {
    const ajuste = await this.dependencias.ajustes.buscar(ajusteId);
    if (!ajuste) throw new RecursoNoEncontrado('El ajuste');
    return ajuste;
  }
}
