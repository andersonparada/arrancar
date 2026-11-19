import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UsuarioConAcceso } from '../../puertos/consultas-de-accesos-a-bodegas.js';
import type { ConsultasDeAccesosABodegas } from '../../puertos/consultas-de-accesos-a-bodegas.js';
import type { DependenciasDeAccesos } from './dependencias-de-accesos.js';

interface Dependencias extends Pick<DependenciasDeAccesos, 'unidadDeTrabajo' | 'consultas'> {
  accesos: ConsultasDeAccesosABodegas;
}

/** Quién tiene acceso a una bodega (para su ficha). */
export class ListarUsuariosDeBodega {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si no existe o el operador no la ve. */
  ejecutar(operador: Operador, bodegaId: string): Promise<UsuarioConAcceso[]> {
    const { unidadDeTrabajo, consultas, accesos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await consultas.obtener(bodegaId);
      return accesos.usuariosConAcceso(bodegaId);
    });
  }
}
