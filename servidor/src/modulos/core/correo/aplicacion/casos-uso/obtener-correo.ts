import { RecursoNoEncontrado } from '../../../compartido/aplicacion/errores.js';
import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import type { CorreoDto } from '../dto/correo.dto.js';
import type { HistorialDeCorreos } from '../puertos/historial-de-correos.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  historial: HistorialDeCorreos;
}

/** La ficha de un correo de la empresa activa. */
export class ObtenerCorreo {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si no existe o es de otra empresa. */
  ejecutar(operador: Operador, id: string): Promise<CorreoDto> {
    const { unidadDeTrabajo, historial } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const correo = await historial.buscar(id);
      if (!correo) throw new RecursoNoEncontrado('El correo');
      return correo;
    });
  }
}
