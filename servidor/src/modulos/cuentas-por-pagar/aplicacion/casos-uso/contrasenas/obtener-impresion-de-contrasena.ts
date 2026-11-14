import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ImpresionDeContrasenaDto } from '../../dto/impresion-de-contrasena.dto.js';
import { armarImpresion, type DependenciasDeImpresion } from './impresion-de-contrasena.js';

/** La vista previa de la contraseña impresa: no marca la impresión (abrirla no gasta la «primera»). */
export class ObtenerImpresionDeContrasena {
  constructor(private readonly dependencias: DependenciasDeImpresion) {}

  /** @throws RecursoNoEncontrado si no existe o es de otra empresa. */
  ejecutar(operador: Operador, id: string): Promise<ImpresionDeContrasenaDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, () =>
      armarImpresion(this.dependencias, operador, { id }),
    );
  }
}
