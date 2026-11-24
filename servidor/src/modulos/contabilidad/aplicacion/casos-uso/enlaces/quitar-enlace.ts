import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { DependenciasDeEnlaces } from './dependencias-de-enlaces.js';

export class QuitarEnlace {
  constructor(private readonly dependencias: DependenciasDeEnlaces) {}

  /**
   * El enlace se lee con `for update`: si otra transacción lo cambia o lo quita al mismo tiempo, esta espera y audita
   * lo que de verdad borra, y un solo `quitar` por cada baja real. Lo ya contabilizado no cambia; lo que llegue después
   * usa la cuenta general del rol, el costo de la línea (rol opcional) o queda por contabilizar con error si no hay respaldo.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   */
  ejecutar(operador: Operador, enlaceId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const enlace = await repositorio.buscarParaQuitar(Identificador.desde(enlaceId));
      if (!enlace) throw new RecursoNoEncontrado('El enlace');
      const anterior = await consultas.obtener(enlaceId);
      await repositorio.eliminar(enlace);
      await auditoria.registrar({ recurso: 'contabilidad.enlaces', registroId: enlaceId, accion: 'quitar', anterior });
    });
  }
}
