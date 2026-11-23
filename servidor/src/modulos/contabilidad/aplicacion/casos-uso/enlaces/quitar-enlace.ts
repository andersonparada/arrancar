import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { DependenciasDeEnlaces } from './dependencias-de-enlaces.js';

export class QuitarEnlace {
  constructor(private readonly dependencias: DependenciasDeEnlaces) {}

  /**
   * Lo que se contabilice después con ese rol quedará con error por falta de enlace. Queda en la auditoría con cómo
   * estaba.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   */
  ejecutar(operador: Operador, enlaceId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const enlace = await repositorio.buscar(Identificador.desde(enlaceId));
      if (!enlace) throw new RecursoNoEncontrado('El enlace');
      const anterior = await consultas.obtener(enlaceId);
      await repositorio.eliminar(enlace);
      await auditoria.registrar({ recurso: 'contabilidad.enlaces', registroId: enlaceId, accion: 'quitar', anterior });
    });
  }
}
