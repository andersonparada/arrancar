import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConciliacionDto, EstadoDeCuentaDto } from '../../dto/conciliacion.dto.js';
import {
  conciliacionBloqueada,
  conciliacionExistente,
  RECURSO_DE_ESTADOS_DE_CUENTA,
  type DependenciasDeConciliaciones,
} from './dependencias-de-conciliaciones.js';

interface SolicitudDeSubida {
  conciliacionId: string;
  contenido: Buffer;
  /** Como lo llamó quien lo subió; solo para mostrar. */
  nombre: string | null;
}

/**
 * Adjunta el estado de cuenta (PDF o foto) a una conciliación en proceso; si ya tenía uno, lo reemplaza y el anterior
 * se borra con rastro en la auditoría. Solo quien elabora. Va en tres tiempos para no retener una conexión mientras
 * qpdf revisa el PDF: (a) una unidad corta que falla rápido, (b) la revisión fuera de toda transacción y (c) la unidad
 * que bloquea la conciliación y guarda.
 */
export class SubirEstadoDeCuenta {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /**
   * @throws ConciliacionNoEstaEnProceso si ya no está en proceso (422; qpdf ni se llama).
   * @throws RevisionDePdfSaturada (429), o un error de PDF o de foto (400), si no se acepta el archivo.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeSubida): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, documentos } = this.dependencias;
    await unidadDeTrabajo.ejecutar(operador, () => this.exigirEnProceso(solicitud.conciliacionId));
    const revisado = await documentos.revisar(operador, solicitud.contenido, solicitud.nombre);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { conciliacionId } = solicitud;
      const conciliacion = await conciliacionBloqueada(this.dependencias.repositorio, conciliacionId);
      conciliacion.exigirEnProceso();
      const anterior = await this.dependencias.consultas.estadoDeCuentaDe(conciliacionId);
      const guardado = await documentos.guardarRevisado(operador, revisado, {
        recursoDueno: RECURSO_DE_ESTADOS_DE_CUENTA,
      });
      const idAnterior = conciliacion.adjuntarEstadoDeCuenta(guardado.id);
      await this.dependencias.repositorio.guardar(conciliacion);
      if (idAnterior) await this.borrarElAnterior({ archivoId: idAnterior, conciliacionId, anterior });
      return this.dependencias.consultas.obtener(conciliacionId);
    });
  }

  private async exigirEnProceso(conciliacionId: string): Promise<void> {
    (await conciliacionExistente(this.dependencias.repositorio, conciliacionId)).exigirEnProceso();
  }

  private async borrarElAnterior(reemplazado: {
    archivoId: string;
    conciliacionId: string;
    anterior: EstadoDeCuentaDto | null;
  }): Promise<void> {
    const { documentos, auditoria } = this.dependencias;
    await documentos.eliminar(reemplazado.archivoId, RECURSO_DE_ESTADOS_DE_CUENTA);
    await auditoria.registrar({
      recurso: 'bancos.conciliaciones',
      registroId: reemplazado.conciliacionId,
      accion: 'quitar',
      anterior: { estadoDeCuenta: reemplazado.anterior },
    });
  }
}
