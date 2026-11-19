import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeUnidad } from '../../datos-de-unidad.js';
import type { UnidadDto, SolicitudDeUnidad } from '../../dto/unidad.dto.js';
import { unidadExistente, type DependenciasDeUnidades } from './dependencias-de-unidades.js';

interface CambioDeUnidad {
  unidadId: string;
  solicitud: SolicitudDeUnidad;
}

export class ActualizarUnidad {
  constructor(private readonly dependencias: DependenciasDeUnidades) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, { unidadId, solicitud }: CambioDeUnidad): Promise<UnidadDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const unidad = await unidadExistente(repositorio, unidadId);
      const anterior = await consultas.obtener(unidadId);
      unidad.cambiarDatos(datosDeUnidad(solicitud));
      await repositorio.guardar(unidad);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'inventarios.unidades',
        registroId: unidadId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(unidadId);
    });
  }
}
