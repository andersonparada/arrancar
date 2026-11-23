import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { exigirEliminable } from '../../../dominio/baja-de-documento.js';
import { DocumentoDeVentaEliminado } from '../../../dominio/eventos.js';
import type { EliminacionDeDocumentoDeVentaDto } from '../../dto/documento-de-venta.dto.js';
import type {
  ControlDePeriodosParaVentas,
  DestinosDeVenta,
  RepositorioDeDocumentosDeVenta,
} from '../../puertos/puertos-de-documentos.js';
import { avisarEliminacion, exigirQueLasNotasSigaCabiendo } from './bajas-con-el-destino.js';
import { revisarElPeriodo } from './guardia-del-periodo.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDocumentosDeVenta;
  destinos: DestinosDeVenta;
  control: ControlDePeriodosParaVentas;
  auditoria: Auditoria;
  publicadorEventos: PublicadorEventos;
}

/**
 * Elimina de verdad un documento «limpio» (§7.2): vigente, sin procesar en la cartera y sin notas (ni anuladas), en un
 * mes que no esté declarado. Avisa a la cartera (`documento_por_eliminar`) para que borre lo suyo, lo audita con la
 * ficha anterior, lo borra (con sus líneas) y, tras confirmar, publica `documento_eliminado`. Lo anulado se queda
 * como rastro fiscal y no se elimina.
 */
export class EliminarDocumentoDeVenta {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado, DocumentoYaAnulado, DocumentoProcesado, DocumentoConNotas,
   *   NotaDeDebitoSostieneNotasDeCredito, PeriodoDeclarado, DestinoInactivo, o el error de la cartera si lo rechaza.
   */
  async ejecutar(operador: Operador, documentoId: string): Promise<EliminacionDeDocumentoDeVentaDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { destino, avisos } = await unidadDeTrabajo.ejecutar(operador, () => this.eliminar(operador, documentoId));
    await publicadorEventos.publicar([
      new DocumentoDeVentaEliminado({ documentoId, empresaId: operador.empresaId, destino }),
    ]);
    return { avisos };
  }

  private async eliminar(operador: Operador, documentoId: string) {
    const { repositorio, destinos, control, auditoria } = this.dependencias;
    const guardado = await repositorio.buscar(documentoId, true);
    if (!guardado) throw new RecursoNoEncontrado('El documento');
    exigirEliminable(guardado.hechos);
    const { ficha } = guardado;
    const avisos = await revisarElPeriodo(control, ficha.periodo);
    await exigirQueLasNotasSigaCabiendo(repositorio, guardado);
    await avisarEliminacion(destinos, operador, { documentoId, destino: ficha.destino });
    await repositorio.eliminar(documentoId);
    await auditoria.registrar({
      recurso: 'libro-de-ventas.documentos',
      registroId: documentoId,
      accion: 'eliminar',
      anterior: ficha,
    });
    return { destino: ficha.destino, avisos };
  }
}
