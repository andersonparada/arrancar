import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ContrasenaDto } from '../../dto/contrasena.dto.js';
import { contrasenaComoDto, type DependenciasDeConsultaDeContrasenas } from './dependencias-de-contrasenas.js';

/** Una contraseña con sus cargos, sus notas y los montos de hoy. */
export class ObtenerContrasena {
  constructor(private readonly dependencias: DependenciasDeConsultaDeContrasenas) {}

  /** @throws RecursoNoEncontrado si no existe o es de otra empresa. */
  ejecutar(operador: Operador, id: string): Promise<ContrasenaDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, () =>
      contrasenaComoDto(this.dependencias, operador, id),
    );
  }
}
