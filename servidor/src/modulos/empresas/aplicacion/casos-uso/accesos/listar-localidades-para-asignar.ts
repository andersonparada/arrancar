import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { LocalidadParaAsignarDto } from '../../dto/accesos-a-localidades.dto.js';
import type { DependenciasDeAccesos } from './dependencias-de-accesos.js';

type Dependencias = Pick<DependenciasDeAccesos, 'unidadDeTrabajo' | 'consultas' | 'asignaciones'>;

/** Todas las localidades de la empresa (también inactivas) con los usuarios que tienen acceso. */
export class ListarLocalidadesParaAsignar {
  constructor(private readonly dependencias: Dependencias) {}

  /** El operador debe ser el «para asignar»: solo así la base deja leer las que no tiene asignadas. */
  ejecutar(operador: Operador): Promise<LocalidadParaAsignarDto[]> {
    const { unidadDeTrabajo, consultas, asignaciones } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const [localidades, accesos] = await Promise.all([consultas.listar(), asignaciones.todas()]);
      return localidades.map(({ id, codigo, nombre, tipoNombre, activo }) => ({
        id,
        codigo,
        nombre,
        tipoNombre,
        activo,
        usuarioIds: accesos.filter((a) => a.localidadId === id).map((a) => a.usuarioId),
      }));
    });
  }
}
