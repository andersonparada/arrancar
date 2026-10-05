import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { avisosDeBajaPorPeriodo, exigirEliminable } from '../../../dominio/baja-de-documento.js';
import type { DestinoDeDocumento } from '../../../dominio/destinos-de-documento.js';
import { DocumentoEliminado } from '../../../dominio/eventos.js';
import type { EliminacionDeDocumentoDto } from '../../dto/documento-ficha.dto.js';
import type { RepositorioDeDocumentosGuardados } from '../../puertos/puertos-de-baja-de-documentos.js';
import type { ControlDePeriodos, DestinosDeDocumentos } from '../../puertos/puertos-de-documentos.js';
import { dtoDeFicha, hechosDe } from './dto-de-ficha.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDocumentosGuardados;
  destinos: DestinosDeDocumentos;
  control: ControlDePeriodos;
  auditoria: Auditoria;
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
}

export interface PeticionDeEliminacion {
  documentoId: string;
  /** El destino que pide la eliminación (orden `eliminar_documento`): ya hizo lo suyo, así que no se le avisa. */
  origen?: DestinoDeDocumento;
}

/**
 * Elimina de verdad un documento «limpio»: vigente, sin procesar en el destino y sin notas de crédito. Avisa al
 * destino (`documento_por_eliminar`) para que borre lo suyo, lo audita con la ficha anterior, lo borra (líneas y
 * retenciones en cascada) y, tras confirmar, publica `documento_eliminado`. Si el período es anterior al mes actual
 * avisa que puede estar declarado.
 */
export class EliminarDocumento {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si no existe.
   * @throws DocumentoYaAnulado, DocumentoProcesadoEnElDestino o DocumentoConNotas si no está limpio.
   * @throws el error del destino si rechaza la eliminación.
   */
  async ejecutar(operador: Operador, peticion: PeticionDeEliminacion): Promise<EliminacionDeDocumentoDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { destino, avisos } = await unidadDeTrabajo.ejecutar(operador, () => this.eliminar(operador, peticion));
    await publicadorEventos.publicar([
      new DocumentoEliminado({ documentoId: peticion.documentoId, empresaId: operador.empresaId, destino }),
    ]);
    return { avisos };
  }

  private async eliminar(operador: Operador, { documentoId, origen }: PeticionDeEliminacion) {
    const { repositorio, destinos, control, auditoria } = this.dependencias;
    const guardado = await repositorio.buscar(documentoId, true);
    if (!guardado) throw new RecursoNoEncontrado('El documento');
    exigirEliminable(hechosDe(guardado));
    await control.exigirAbierto(guardado.documento.periodo);
    const { destino } = guardado.documento;
    if (origen !== destino) await destinos.avisarPorEliminar(operador, { documentoId, destino });
    await repositorio.eliminar(documentoId);
    await auditoria.registrar({
      recurso: 'libro-de-compras.documentos',
      registroId: documentoId,
      accion: 'eliminar',
      anterior: dtoDeFicha(guardado),
    });
    const hoy = await this.dependencias.reloj.hoy(operador);
    return { destino, avisos: avisosDeBajaPorPeriodo(guardado.documento.periodo, hoy) };
  }
}
