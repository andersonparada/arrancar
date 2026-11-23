import type { Operador } from '../../../../../core/compartido/aplicacion/operador.js';
import { inmuebleExistente } from '../dependencias-de-inmuebles.js';
import type { DependenciasDeValores } from './dependencias-de-valores.js';

interface ValorAEliminar {
  inmuebleId: string;
  valorId: string;
}

export class EliminarValorDeInmueble {
  constructor(private readonly dependencias: DependenciasDeValores) {}

  /**
   * Antes de borrar pregunta a los demás módulos (Activos fijos rechaza si ya lo usó en un mes cerrado: entonces se
   * registra otro valor hacia adelante). Queda en la auditoría, bajo el recurso permanente de los inmuebles, el valor como estaba (con su `inmuebleId`).
   * @throws RecursoNoEncontrado si el inmueble o el valor no existen, o el operador no ve el inmueble.
   */
  ejecutar(operador: Operador, datos: ValorAEliminar): Promise<void> {
    const { unidadDeTrabajo, inmuebles, repositorio, consultas, avisos, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await inmuebleExistente(inmuebles, datos.inmuebleId);
      const anterior = await consultas.obtener(datos);
      await avisos.porEliminar(operador, {
        inmuebleId: datos.inmuebleId,
        valorId: datos.valorId,
        fuente: anterior.fuente,
        vigenteDesde: anterior.vigenteDesde,
      });
      await repositorio.eliminar(datos.valorId);
      await auditoria.registrar({
        recurso: 'empresas.inmuebles',
        registroId: datos.valorId,
        accion: 'eliminar',
        anterior,
      });
    });
  }
}
