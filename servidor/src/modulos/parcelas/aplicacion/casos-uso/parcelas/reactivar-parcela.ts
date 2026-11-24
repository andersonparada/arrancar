import { CambiarEstadoDeParcela } from './cambiar-estado-de-parcela.js';

export class ReactivarParcela extends CambiarEstadoDeParcela {
  protected readonly activoDespues = true;
}
