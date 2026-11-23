import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { DependenciasDeEnlaces } from './dependencias-de-enlaces.js';

export class QuitarEnlace {
  constructor(private readonly dependencias: DependenciasDeEnlaces) {}

  /**
   * El enlace se lee con `for update`: si otra transacción lo cambia o lo quita al mismo tiempo, esta espera y audita
   * lo que de verdad borra. Lo que se contabilice después con ese rol quedará con error por falta de enlace. Queda en la auditoría con cómo
   * estaba.
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
