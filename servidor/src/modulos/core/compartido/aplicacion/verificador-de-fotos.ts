import { DatoInvalido } from '../dominio/errores.js';

/** La foto elegida no existe, es de otra empresa, no es una imagen o pertenece a otro recurso. */
export class FotoNoValida extends DatoInvalido {
  readonly codigo = 'foto_no_valida';

  constructor() {
    super('La foto elegida no existe o no se puede usar. Súbela de nuevo.');
  }
}

/**
 * Comprueba, dentro de la unidad de trabajo del módulo que la usa, que una foto elegida
 * exista para la empresa activa, sea una imagen y no sea de uso reservado de otro recurso.
 */
export interface VerificadorDeFotos {
  /** Si `archivoId` es nulo no hay nada que revisar. @throws FotoNoValida */
  exigir(archivoId: string | null): Promise<void>;
}
