import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Clase } from '../../../dominio/clase.js';
import { datosDeClase } from '../../datos-de-clase.js';
import type { ClaseDto, SolicitudDeClase } from '../../dto/clase.dto.js';
import type { DependenciasDeClases } from './dependencias-de-clases.js';

export class CrearClase {
  constructor(private readonly dependencias: DependenciasDeClases) {}

  /**
   * @throws ClaseInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws ClaseConPorcentajeSobreElMaximo si el porcentaje pasa del tope de ley del inciso.
   * @throws RecursoDuplicado si repite un dato que debe ser único.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeClase): Promise<ClaseDto> {
    const { unidadDeTrabajo, repositorio, consultas, topes } = this.dependencias;
    const topesDeLey = await topes.paraEmpresa(operador);
    const clase = Clase.crear(
      Identificador.desde(operador.empresaId),
      datosDeClase(solicitud),
      topesDeLey[solicitud.incisoFiscal],
    );
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await repositorio.agregar(clase);
      return consultas.obtener(clase.id.valor);
    });
  }
}
