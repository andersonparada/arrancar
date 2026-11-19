import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { BodegaParaAsignarDto } from '../../dto/accesos-a-bodegas.dto.js';
import type { DependenciasDeAccesos } from './dependencias-de-accesos.js';

type Dependencias = Pick<DependenciasDeAccesos, 'unidadDeTrabajo' | 'consultas' | 'asignaciones'>;

/** Todas las bodegas de la empresa (también inactivas) con los usuarios que tienen acceso. */
export class ListarBodegasParaAsignar {
  constructor(private readonly dependencias: Dependencias) {}

  /** El operador debe ser el «para asignar»: solo así la base deja leer las que no tiene asignadas. */
  ejecutar(operador: Operador): Promise<BodegaParaAsignarDto[]> {
    const { unidadDeTrabajo, consultas, asignaciones } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const [bodegas, accesos] = await Promise.all([consultas.listar(), asignaciones.todas()]);
      return bodegas.map(({ id, codigo, nombre, localidadNombre, activo }) => ({
        id,
        codigo,
        nombre,
        localidadNombre,
        activo,
        usuarioIds: accesos.filter((a) => a.bodegaId === id).map((a) => a.usuarioId),
      }));
    });
  }
}
