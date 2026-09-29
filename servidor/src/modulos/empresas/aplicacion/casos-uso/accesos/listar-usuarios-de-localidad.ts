import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UsuarioConAcceso } from '../../puertos/consultas-de-accesos-a-localidades.js';
import type { ConsultasDeAccesosALocalidades } from '../../puertos/consultas-de-accesos-a-localidades.js';
import type { DependenciasDeAccesos } from './dependencias-de-accesos.js';

interface Dependencias extends Pick<DependenciasDeAccesos, 'unidadDeTrabajo' | 'consultas'> {
  accesos: ConsultasDeAccesosALocalidades;
}

/** Quién tiene acceso a una localidad (para su ficha). */
export class ListarUsuariosDeLocalidad {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si no existe o el operador no la ve. */
  ejecutar(operador: Operador, localidadId: string): Promise<UsuarioConAcceso[]> {
    const { unidadDeTrabajo, consultas, accesos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await consultas.obtener(localidadId);
      return accesos.usuariosConAcceso(localidadId);
    });
  }
}
