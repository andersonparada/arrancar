import { DatoInvalido } from '../../core/compartido/dominio/errores.js';

export class PeriodoInvertido extends DatoInvalido {
  readonly codigo = 'periodo_invertido';

  constructor() {
    super('La fecha «desde» no puede ser posterior a la fecha «hasta».', { campo: 'desde' });
  }
}
