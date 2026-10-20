import { ReglaDeNegocioInfringida } from '../../../core/compartido/dominio/errores.js';

/** El régimen del período no declara compras en el SAT-2237, así que no hay archivo que exportar. */
export class Sat2237NoAplica extends ReglaDeNegocioInfringida {
  readonly codigo = 'sat_2237_no_aplica';
}
