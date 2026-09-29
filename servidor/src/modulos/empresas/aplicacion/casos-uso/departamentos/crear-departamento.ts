import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Departamento } from '../../../dominio/departamento.js';
import { datosDeDepartamento } from '../../datos-de-departamento.js';
import type { DepartamentoDto, SolicitudDeDepartamento } from '../../dto/departamento.dto.js';
import type { DependenciasDeDepartamentos } from './dependencias-de-departamentos.js';

export class CrearDepartamento {
  constructor(private readonly dependencias: DependenciasDeDepartamentos) {}

  /**
   * @throws DepartamentoInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si repite un dato que debe ser único.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeDepartamento): Promise<DepartamentoDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const departamento = Departamento.crear(Identificador.desde(operador.empresaId), datosDeDepartamento(solicitud));
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await consultas.exigirReferencias(solicitud);
      await repositorio.agregar(departamento);
      return consultas.obtener(departamento.id.valor);
    });
  }
}
