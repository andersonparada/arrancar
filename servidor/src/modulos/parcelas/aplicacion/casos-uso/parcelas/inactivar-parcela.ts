import { CambiarEstadoDeParcela } from './cambiar-estado-de-parcela.js';

export class InactivarParcela extends CambiarEstadoDeParcela {
  protected readonly activoDespues = false;
}
