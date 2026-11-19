import { enteroObligatorio } from '../../core/compartido/http/esquemas-comunes.js';

/** Mayor entero que guarda la columna `integer` de la base. */
const MAXIMO_ENTERO_DE_LA_BASE = 2147483647;

/** Número de cheque que puede faltar: entero de 1 en adelante y que quepa en la base. */
export const numeroDeChequeOpcional = () =>
  enteroObligatorio()
    .min(1, 'El número de cheque debe ser mayor que cero.')
    .max(MAXIMO_ENTERO_DE_LA_BASE, `El número de cheque no puede pasar de ${MAXIMO_ENTERO_DE_LA_BASE}.`)
    .nullish()
    .transform((valor) => valor ?? null);
