import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Inmueble } from '../../../dominio/inmueble.js';
import { datosDeInmueble } from '../../datos-de-inmueble.js';
import type { InmuebleDto, SolicitudDeInmueble } from '../../dto/inmueble.dto.js';
import type { DependenciasDeInmuebles } from './dependencias-de-inmuebles.js';

export class CrearInmueble {
  constructor(private readonly dependencias: DependenciasDeInmuebles) {}

  /**
   * @throws InmuebleInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si repite un dato que debe ser único.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeInmueble): Promise<InmuebleDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const inmueble = Inmueble.crear(Identificador.desde(operador.empresaId), datosDeInmueble(solicitud));
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await consultas.exigirReferencias(solicitud);
      await repositorio.agregar(inmueble);
      return consultas.obtener(inmueble.id.valor);
    });
  }
}
