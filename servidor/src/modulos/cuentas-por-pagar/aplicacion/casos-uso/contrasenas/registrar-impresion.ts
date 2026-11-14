import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ImpresionDeContrasenaDto } from '../../dto/impresion-de-contrasena.dto.js';
import type { RepositorioDeContrasenas } from '../../puertos/puertos-de-contrasenas.js';
import { armarImpresion, type DependenciasDeImpresion } from './impresion-de-contrasena.js';

export interface DependenciasParaRegistrarImpresion extends DependenciasDeImpresion {
  repositorio: RepositorioDeContrasenas;
}

/**
 * Lo que llama el botón «Imprimir» antes de abrir el diálogo de impresión: guarda la primera impresión (si ya la
 * había, esta sale como «REIMPRESIÓN») y responde la contraseña con la marca que corresponde. No se audita: es ver.
 */
export class RegistrarImpresion {
  constructor(private readonly dependencias: DependenciasParaRegistrarImpresion) {}

  /** @throws RecursoNoEncontrado si no existe o es de otra empresa. */
  ejecutar(operador: Operador, id: string): Promise<ImpresionDeContrasenaDto> {
    const { unidadDeTrabajo, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const esLaPrimera = await repositorio.marcarImpresion(id);
      return armarImpresion(this.dependencias, operador, { id, reimpresion: !esLaPrimera });
    });
  }
}
