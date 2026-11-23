import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { inmuebleExistente, inmuebleParaAuditar, type DependenciasDeInmuebles } from './dependencias-de-inmuebles.js';

export class EliminarInmueble {
  constructor(private readonly dependencias: DependenciasDeInmuebles) {}

  /**
   * Queda en la auditoría el inmueble como estaba, con sus valores.
   * @throws RecursoNoEncontrado si no existe o el operador no lo ve.
   * @throws InmuebleEnUso si Parcelas o Activos fijos lo usan (la base de datos lo impide): entonces se inactiva.
   */
  ejecutar(operador: Operador, inmuebleId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const inmueble = await inmuebleExistente(repositorio, inmuebleId);
      const anterior = await inmuebleParaAuditar(this.dependencias, inmuebleId);
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
