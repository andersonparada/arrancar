import type { Readable } from 'node:stream';
import type { Almacenamiento } from '../../../compartido/aplicacion/almacenamiento.js';
import { RecursoNoEncontrado } from '../../../compartido/aplicacion/errores.js';
import { RUTA_DEL_LOGO } from '../../dominio/logo.js';

/** El logo propio de la instalación, en PNG. */
export class AbrirLogo {
  constructor(private readonly dependencias: { almacenamiento: Almacenamiento }) {}

  /** @throws RecursoNoEncontrado si la instalación no tiene logo propio. */
  async ejecutar(): Promise<Readable> {
    try {
      return await this.dependencias.almacenamiento.leer(RUTA_DEL_LOGO);
    } catch {
      throw new RecursoNoEncontrado('El logo');
    }
  }
}
