import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { localidadExistente, type DependenciasDeLocalidades } from './dependencias-de-localidades.js';

export class EliminarLocalidad {
  constructor(private readonly dependencias: DependenciasDeLocalidades) {}

  /**
   * Quedan en la auditoría la localidad como estaba y los usuarios que tenían acceso (sus accesos se
   * borran con ella).
   * @throws RecursoNoEncontrado si no existe o el operador no la ve.
   * @throws RecursoEnUso si algo la usa (la base de datos lo impide): entonces se inactiva.
   */
  ejecutar(operador: Operador, localidadId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, accesos, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const localidad = await localidadExistente(repositorio, localidadId);
      const anterior = await consultas.obtener(localidadId);
      const usuariosConAcceso = await accesos.usuariosConAcceso(localidadId);
      await repositorio.eliminar(localidad);
      await auditoria.registrar({
        recurso: 'empresas.localidades',
        registroId: localidadId,
        accion: 'eliminar',
        anterior: { ...anterior, usuariosConAcceso },
      });
    });
  }
}
