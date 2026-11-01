import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { esDeLoPropio, exigirRegistrado } from '../../../dominio/ciclo-de-vida.js';
import type { DocumentoConAplicaciones, DocumentoPorPagar } from '../../../dominio/documento-por-pagar.js';
import { DocumentoAutorizadoEvento } from '../../../dominio/eventos.js';
import { AutorizacionDeLoPropio } from '../../errores.js';
import type { DocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import { dtoDeFicha } from '../../dto/ficha-del-documento.dto.js';
import { bloquear, dtosDe, etiquetaDe, filaDe, type DependenciasDeAutorizacion } from './dependencias-de-acciones.js';

export interface PeticionDeAutorizacion {
  ids: readonly string[];
  /** El operador tiene el permiso `cuentas-por-pagar.documentos.autorizar-propios`. */
  puedeAutorizarPropios: boolean;
}

const MOTIVO_DE_LO_PROPIO = 'Autorizó un documento que ingresó o completó.';

/**
 * Autoriza en lote (hasta 100, todo o nada): `registrado` pasa a `autorizado`, que significa «aprobado para pago» y no
 * provisiona nada (U12). Por cada documento manda primero `marcar_procesado` a Libro de compras (que bloquea su fila) y
 * después bloquea la de aquí y vuelve a revisar. Separación de funciones: quien ingresó o completó un documento solo lo
 * autoriza con el permiso `autorizar-propios`, y entonces queda marcado y auditado. Publica `documento_autorizado` de cada
 * uno al confirmar. Los ids se recorren en orden para que dos lotes que se cruzan no se traben.
 */
export class AutorizarDocumentos {
  constructor(private readonly dependencias: DependenciasDeAutorizacion) {}

  /**
   * @throws RecursoNoEncontrado si algún documento no existe.
   * @throws DocumentoNoRegistrado si alguno no está completado.
   * @throws AutorizacionDeLoPropio si alguno es de lo propio y falta el permiso.
   */
  async ejecutar(operador: Operador, peticion: PeticionDeAutorizacion): Promise<DocumentoPorPagarDto[]> {
    const ids = [...new Set(peticion.ids)].sort();
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const resultado = await unidadDeTrabajo.ejecutar(operador, async () => {
      const eventos: DocumentoAutorizadoEvento[] = [];
      for (const id of ids) eventos.push(await this.autorizar(operador, id, peticion.puedeAutorizarPropios));
      return { eventos, dtos: await dtosDe(this.dependencias, operador, ids) };
    });
    await publicadorEventos.publicar(resultado.eventos);
    return resultado.dtos;
  }

  private async autorizar(
    operador: Operador,
    id: string,
    puedeAutorizarPropios: boolean,
  ): Promise<DocumentoAutorizadoEvento> {
    const { documentos, consultas, libroDeCompras } = this.dependencias;
    const { documento: previo, origen } = await filaDe(consultas, id);
    const etiqueta = etiquetaDe(origen);
    exigirRegistrado(previo, etiqueta);
    await libroDeCompras.marcarProcesado(operador, previo.documentoId, true);
    const guardado = await bloquear(documentos, id);
    exigirRegistrado(guardado.documento, etiqueta);
    const propia = esDeLoPropio(guardado.documento, operador.usuarioId);
    if (propia && !puedeAutorizarPropios) throw new AutorizacionDeLoPropio(etiqueta);
    await documentos.autorizar(id, { autorizadoPor: operador.usuarioId, autorizacionPropia: propia });
    if (propia) await this.auditarLoPropio(id, guardado);
    return eventoDeAutorizacion(operador, guardado.documento, propia);
  }

  private auditarLoPropio(id: string, guardado: DocumentoConAplicaciones): Promise<void> {
    return this.dependencias.auditoria.registrar({
      recurso: 'cuentas-por-pagar.documentos',
      registroId: id,
      accion: 'autorizar',
      anterior: dtoDeFicha(guardado),
      motivo: MOTIVO_DE_LO_PROPIO,
    });
  }
}

function eventoDeAutorizacion(
  operador: Operador,
  documento: DocumentoPorPagar,
  propia: boolean,
): DocumentoAutorizadoEvento {
  return new DocumentoAutorizadoEvento({
    empresaId: operador.empresaId,
    documentoId: documento.id,
    documentoDeCompraId: documento.documentoId,
    tipo: documento.tipo,
    proveedorId: documento.proveedorId,
    totalCentavos: documento.totalCentavos,
    retencionesCentavos: documento.retencionesCentavos,
    autorizacionPropia: propia,
  });
}
