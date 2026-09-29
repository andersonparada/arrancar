import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { TipoDeLocalidad } from '../../../dominio/tipo-de-localidad.js';
import { datosDeTipoDeLocalidad } from '../../datos-de-tipo-de-localidad.js';
import type { TipoDeLocalidadDto, SolicitudDeTipoDeLocalidad } from '../../dto/tipo-de-localidad.dto.js';
import type { DependenciasDeTiposDeLocalidad } from './dependencias-de-tipos-de-localidad.js';

export class CrearTipoDeLocalidad {
  constructor(private readonly dependencias: DependenciasDeTiposDeLocalidad) {}

  /**
   * @throws TipoDeLocalidadInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si repite un dato que debe ser único.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeTipoDeLocalidad): Promise<TipoDeLocalidadDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const tipoDeLocalidad = TipoDeLocalidad.crear(
      Identificador.desde(operador.empresaId),
      datosDeTipoDeLocalidad(solicitud),
    );
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await repositorio.agregar(tipoDeLocalidad);
      return consultas.obtener(tipoDeLocalidad.id.valor);
    });
  }
}
