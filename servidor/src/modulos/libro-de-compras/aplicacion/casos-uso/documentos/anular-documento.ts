import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { exigirAnulable, motivoDeAnulacionValido } from '../../../dominio/baja-de-documento.js';
import type { DestinoDeDocumento } from '../../../dominio/destinos-de-documento.js';
import { DocumentoAnulado } from '../../../dominio/eventos.js';
import type { DocumentoFichaDto } from '../../dto/documento-ficha.dto.js';
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
}

export interface PeticionDeAnulacion {
  documentoId: string;
  motivo: string;
  /** El destino que pide la anulación (orden `anular_documento`): ya hizo lo suyo, así que no se le avisa. */
  origen?: DestinoDeDocumento;
}

/**
 * Anula un documento vigente con su motivo: avisa al destino (`documento_por_anular`) antes de cambiar nada, lo
 * deja `anulado` con su fecha y usuario (su número queda libre), lo audita con la ficha anterior y, tras confirmar,
 * publica `documento_anulado`. Si el destino lo rechaza, no cambia nada. Lo usan la ruta y la orden del mediador.
 */
export class AnularDocumento {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si no existe; MotivoDeAnulacionInvalido si falta o pasa de 300 caracteres.
   * @throws DocumentoYaAnulado o DocumentoConNotasVigentes si no se puede anular.
   * @throws el error del destino si rechaza la anulación.
   */
  async ejecutar(operador: Operador, peticion: PeticionDeAnulacion): Promise<DocumentoFichaDto> {
    const motivo = motivoDeAnulacionValido(peticion.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const ficha = await unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, { ...peticion, motivo }));
    await publicadorEventos.publicar([
      new DocumentoAnulado({ documentoId: ficha.id, empresaId: operador.empresaId, destino: ficha.destino }),
    ]);
    return ficha;
  }

  private async anular(operador: Operador, { documentoId, motivo, origen }: PeticionDeAnulacion) {
    const { repositorio, destinos, control, auditoria } = this.dependencias;
    const guardado = await repositorio.buscar(documentoId, true);
    if (!guardado) throw new RecursoNoEncontrado('El documento');
    exigirAnulable(hechosDe(guardado));
    await control.exigirAbierto(guardado.documento.periodo);
    const { destino } = guardado.documento;
    if (origen !== destino) await destinos.avisarPorAnular(operador, { documentoId, destino, motivo });
    await repositorio.anular(documentoId, { anuladoPor: operador.usuarioId, motivo });
    await auditoria.registrar({
      recurso: 'libro-de-compras.documentos',
      registroId: documentoId,
      accion: 'anular',
      anterior: dtoDeFicha(guardado),
      motivo,
    });
    return dtoDeFicha((await repositorio.buscar(documentoId, false)) ?? guardado);
  }
}
