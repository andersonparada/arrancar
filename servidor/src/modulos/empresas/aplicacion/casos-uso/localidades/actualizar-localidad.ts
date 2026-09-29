import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeLocalidad } from '../../datos-de-localidad.js';
import type { LocalidadDto, SolicitudDeLocalidad } from '../../dto/localidad.dto.js';
import { localidadExistente, type DependenciasDeLocalidades } from './dependencias-de-localidades.js';

interface CambioDeLocalidad {
  localidadId: string;
  solicitud: SolicitudDeLocalidad;
}

export class ActualizarLocalidad {
  constructor(private readonly dependencias: DependenciasDeLocalidades) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, { localidadId, solicitud }: CambioDeLocalidad): Promise<LocalidadDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const localidad = await localidadExistente(repositorio, localidadId);
      await consultas.exigirReferencias(solicitud);
      const anterior = await consultas.obtener(localidadId);
      localidad.cambiarDatos(datosDeLocalidad(solicitud));
      await repositorio.guardar(localidad);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'empresas.localidades',
        registroId: localidadId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(localidadId);
    });
  }
}
