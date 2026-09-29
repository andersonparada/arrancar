import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeTipoDeLocalidad } from '../../datos-de-tipo-de-localidad.js';
import type { TipoDeLocalidadDto, SolicitudDeTipoDeLocalidad } from '../../dto/tipo-de-localidad.dto.js';
import { tipoDeLocalidadExistente, type DependenciasDeTiposDeLocalidad } from './dependencias-de-tipos-de-localidad.js';

interface CambioDeTipoDeLocalidad {
  tipoDeLocalidadId: string;
  solicitud: SolicitudDeTipoDeLocalidad;
}

export class ActualizarTipoDeLocalidad {
  constructor(private readonly dependencias: DependenciasDeTiposDeLocalidad) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, { tipoDeLocalidadId, solicitud }: CambioDeTipoDeLocalidad): Promise<TipoDeLocalidadDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const tipoDeLocalidad = await tipoDeLocalidadExistente(repositorio, tipoDeLocalidadId);
      const anterior = await consultas.obtener(tipoDeLocalidadId);
      tipoDeLocalidad.cambiarDatos(datosDeTipoDeLocalidad(solicitud));
      await repositorio.guardar(tipoDeLocalidad);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'empresas.tipos-de-localidad',
        registroId: tipoDeLocalidadId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(tipoDeLocalidadId);
    });
  }
}
