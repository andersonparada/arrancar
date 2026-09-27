import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import type { AsignadorDeNombreDeUsuario } from '../asignador-de-nombre-de-usuario.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  asignador: AsignadorDeNombreDeUsuario;
}

/** Se muestra mientras se escribe el nombre de la persona nueva. */
export class SugerirNombreDeUsuario {
  constructor(private readonly dependencias: Dependencias) {}

  /** `usuario` es `null` si todas las variantes están ocupadas. */
  ejecutar(operador: Operador, nombres: string, apellidos: string): Promise<{ usuario: string | null }> {
    const { unidadDeTrabajo, asignador } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const sugerido = await asignador.sugerir(nombres, apellidos);
      return { usuario: sugerido?.valor ?? null };
    });
  }
}
