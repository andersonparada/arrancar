import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EvidenciaDto } from '../../dto/saldo-inicial.dto.js';
import {
  abrirEscritura,
  RECURSO_DE_SALDOS_INICIALES,
  type DependenciasDeSaldosIniciales,
} from './dependencias-de-saldos-iniciales.js';

interface SolicitudDeEvidencia {
  cuentaBancariaId: string;
  contenido: Buffer;
  /** Como lo llamó quien lo subió; solo para mostrar. */
  nombre: string | null;
}

/**
 * Adjunta la evidencia de la apertura (último estado de cuenta o última conciliación del sistema anterior; PDF o
 * foto) a la cuenta, con la carga abierta. Si ya tenía una, la reemplaza y la anterior se borra con rastro en la
 * auditoría. Va en tres tiempos para no retener una conexión mientras qpdf revisa el PDF: (a) una unidad corta que
 * falla rápido, (b) la revisión fuera de toda transacción y (c) la unidad que bloquea y guarda.
 */
export class SubirEvidenciaDeApertura {
  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {}

  /**
   * @throws SinFechaDeInicio, CargaInicialCerrada (422; qpdf ni se llama); RecursoNoEncontrado si la cuenta no tiene
   *   saldo inicial.
   * @throws RevisionDePdfSaturada (429), o un error de PDF o de foto (400), si no se acepta el archivo.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeEvidencia): Promise<EvidenciaDto> {
    const { unidadDeTrabajo, documentos } = this.dependencias;
    await unidadDeTrabajo.ejecutar(operador, () => this.exigirLista(operador, solicitud.cuentaBancariaId));
    const revisado = await documentos.revisar(operador, solicitud.contenido, solicitud.nombre);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { cuentaBancariaId } = solicitud;
      const cabecera = await this.exigirLista(operador, cuentaBancariaId);
      const anterior = await this.dependencias.consultas.evidenciaDe(cuentaBancariaId);
      const guardado = await documentos.guardarRevisado(operador, revisado, {
        recursoDueno: RECURSO_DE_SALDOS_INICIALES,
      });
      await this.dependencias.cabeceras.ponerEvidencia(cabecera.id, guardado.id);
      if (cabecera.evidenciaArchivoId) await this.borrarLaAnterior(cabecera, anterior);
      return (await this.dependencias.consultas.evidenciaDe(cuentaBancariaId))!;
    });
  }

  private async exigirLista(operador: Operador, cuentaBancariaId: string) {
    const { cabecera } = await abrirEscritura(this.dependencias, operador, cuentaBancariaId);
    if (!cabecera) throw new RecursoNoEncontrado('El saldo inicial');
    return cabecera;
  }

  private async borrarLaAnterior(
    cabecera: { id: string; evidenciaArchivoId: string | null },
    anterior: EvidenciaDto | null,
  ): Promise<void> {
    const { documentos, auditoria } = this.dependencias;
    await documentos.eliminar(cabecera.evidenciaArchivoId!, RECURSO_DE_SALDOS_INICIALES);
    await auditoria.registrar({
      recurso: RECURSO_DE_SALDOS_INICIALES,
      registroId: cabecera.id,
      accion: 'quitar',
      anterior: { evidencia: anterior },
    });
  }
}
