import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { BoletaInexistente } from '../../errores-de-boleta-firmada.js';
import type { BoletaFirmadaDto } from '../../dto/traslado.dto.js';
import { RECURSO_DE_TRASLADOS, type DependenciasDeBoletaFirmada } from './dependencias-de-boleta-firmada.js';

interface SolicitudDeBoletaFirmada {
  grupoId: string;
  contenido: Buffer;
  /** Como lo llamó quien lo subió; solo para mostrar. */
  nombre: string | null;
}

/**
 * Guarda o reemplaza el escaneo firmado de una boleta (I-8 b; PDF o foto). Si ya tenía uno, el anterior se borra y la
 * auditoría `adjuntar` lo deja como estaba. Va en tres tiempos para no retener una conexión mientras qpdf revisa el
 * PDF: (a) una unidad corta que falla rápido, (b) la revisión fuera de toda transacción y (c) la unidad que bloquea y
 * guarda.
 */
export class SubirBoletaFirmada {
  constructor(private readonly dependencias: DependenciasDeBoletaFirmada) {}

  /**
   * @throws BoletaInexistente (404) si el grupo no existe o está anulado; qpdf ni se llama.
   * @throws RevisionDePdfSaturada (429), o un error de PDF o de foto (400), si no se acepta el archivo.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeBoletaFirmada): Promise<BoletaFirmadaDto> {
    const { unidadDeTrabajo, documentos } = this.dependencias;
    await unidadDeTrabajo.ejecutar(operador, () => this.exigirVigente(solicitud.grupoId));
    const revisado = await documentos.revisar(operador, solicitud.contenido, solicitud.nombre);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { grupoId } = solicitud;
      await this.dependencias.boletasFirmadas.bloquear(grupoId);
      await this.exigirVigente(grupoId);
      const anterior = await this.dependencias.consultasDeTraslados.firmadaDe(grupoId);
      const archivoAnterior = await this.dependencias.boletasFirmadas.archivoDe(grupoId);
      const guardado = await documentos.guardarRevisado(operador, revisado, { recursoDueno: RECURSO_DE_TRASLADOS });
      await this.dependencias.boletasFirmadas.poner(grupoId, guardado.id);
      if (archivoAnterior) await documentos.eliminar(archivoAnterior, RECURSO_DE_TRASLADOS);
      await this.dependencias.auditoria.registrar({
        recurso: RECURSO_DE_TRASLADOS,
        registroId: grupoId,
        accion: 'adjuntar',
        anterior: { firmada: anterior },
      });
      return (await this.dependencias.consultasDeTraslados.firmadaDe(grupoId))!;
    });
  }

  private async exigirVigente(grupoId: string): Promise<void> {
    const renglones = await this.dependencias.traslados.delGrupo(grupoId);
    const primero = renglones[0];
    if (!primero || primero.instantanea().estado === 'anulado') throw new BoletaInexistente();
  }
}
