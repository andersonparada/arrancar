import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { inmuebleExistente, type DependenciasDeInmuebles } from './dependencias-de-inmuebles.js';

export class EliminarInmueble {
  constructor(private readonly dependencias: DependenciasDeInmuebles) {}

  /**
   * Queda en la auditoría el inmueble como estaba.
   * @throws RecursoNoEncontrado si no existe o el operador no lo ve.
   * @throws InmuebleEnUso si Parcelas o Activos fijos lo usan (la base de datos lo impide): entonces se inactiva.
   */
  ejecutar(operador: Operador, inmuebleId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const inmueble = await inmuebleExistente(repositorio, inmuebleId);
      const anterior = await consultas.obtener(inmuebleId);
      await repositorio.eliminar(inmueble);
      await auditoria.registrar({
        recurso: 'empresas.inmuebles',
        registroId: inmuebleId,
        accion: 'eliminar',
        anterior,
      });
    });
  }
}
