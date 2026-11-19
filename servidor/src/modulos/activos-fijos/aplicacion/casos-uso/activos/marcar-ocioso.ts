import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ActivoFichaDto, SolicitudDeOcio } from '../../dto/activo.dto.js';
import { activoExistente, type DependenciasDeActivos } from './dependencias-de-activos.js';

interface CambioDeOcio {
  activoId: string;
  solicitud: SolicitudDeOcio;
}

export class MarcarOcioso {
  constructor(private readonly dependencias: DependenciasDeActivos) {}

  /**
   * Marca el activo como ocioso (con fecha y motivo) o le quita la marca. Sigue depreciándose; ambos casos quedan en
   * la auditoría como `corregir` con cómo estaba.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws MotivoDeOcioRequerido si se marca sin motivo.
   * @throws ActivoNoEnUso si el activo no está en uso.
   */
  ejecutar(operador: Operador, { activoId, solicitud }: CambioDeOcio): Promise<ActivoFichaDto> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const activo = await activoExistente(repositorio, activoId);
      const anterior = await consultas.obtener(activoId);
      const hoy = await reloj.hoy(operador);
      if (solicitud.ocioso) activo.marcarOcioso({ fecha: solicitud.fecha, motivo: solicitud.motivo ?? '' }, hoy);
      else activo.quitarOcioso(solicitud.fecha, hoy);
      await repositorio.guardar(activo);
      await auditoria.registrar({
        recurso: 'activos-fijos.activos',
        registroId: activoId,
        accion: 'corregir',
        anterior,
        motivo: solicitud.motivo,
      });
      return consultas.obtener(activoId);
    });
  }
}
