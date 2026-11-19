import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeInmueble } from '../../datos-de-inmueble.js';
import type { InmuebleDto, SolicitudDeInmueble } from '../../dto/inmueble.dto.js';
import { inmuebleExistente, type DependenciasDeInmuebles } from './dependencias-de-inmuebles.js';

interface CambioDeInmueble {
  inmuebleId: string;
  solicitud: SolicitudDeInmueble;
}

export class ActualizarInmueble {
  constructor(private readonly dependencias: DependenciasDeInmuebles) {}

  /**
   * Cambia los datos; el estado activo no cambia aquí (para eso están inactivar y reactivar).
   * @throws RecursoNoEncontrado si no existe o el operador no lo ve.
   * @throws InmuebleInvalido u otro error de datos si no cumple las reglas del dominio.
   */
  ejecutar(operador: Operador, { inmuebleId, solicitud }: CambioDeInmueble): Promise<InmuebleDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const inmueble = await inmuebleExistente(repositorio, inmuebleId);
      await consultas.exigirReferencias(solicitud);
      inmueble.cambiarDatos(datosDeInmueble(solicitud));
      await repositorio.guardar(inmueble);
      return consultas.obtener(inmuebleId);
    });
  }
}
