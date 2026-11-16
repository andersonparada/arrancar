import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { fechaLegible } from './avisos.js';

/** El corte es anterior al día antes de la fecha de inicio: antes de eso los datos no están completos. */
export class CorteAnteriorAlInicio extends DatoInvalido {
  readonly codigo = 'corte_anterior_al_inicio';

  constructor(corteMinimo: string) {
    super(
      `La fecha de corte no puede ser anterior al ${fechaLegible(corteMinimo)}, el día antes de la fecha de inicio.`,
      {
        campo: 'corte',
      },
    );
  }
}
