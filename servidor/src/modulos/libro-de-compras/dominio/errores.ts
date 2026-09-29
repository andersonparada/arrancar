import { DatoInvalido } from '../../core/compartido/dominio/errores.js';

/** Un campo de los datos fiscales que no cumple una regla; `campo` es el nombre del campo de la sección. */
export interface ProblemaDeDatosFiscales {
  campo: string;
  mensaje: string;
}

/** Los datos fiscales se contradicen (por ejemplo, un pequeño contribuyente que es agente de retención). */
export class DatosFiscalesInvalidos extends DatoInvalido {
  readonly codigo = 'datos_fiscales_invalidos';

  constructor(readonly problemas: readonly ProblemaDeDatosFiscales[]) {
    super(problemas.map((problema) => problema.mensaje).join(' '), problemas);
  }
}
