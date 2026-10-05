import { DatoInvalido } from '../../compartido/dominio/errores.js';

/** La fecha no tiene el formato `AAAA-MM-DD` o no existe en el calendario. */
export class FechaInvalida extends DatoInvalido {
  readonly codigo = 'fecha_invalida';

  constructor(fecha: string) {
    super(`«${fecha}» no es una fecha válida (AAAA-MM-DD).`);
  }
}

/** El mes no tiene el formato `AAAA-MM`, o no tiene tantos días hábiles. */
export class DiaHabilInexistente extends DatoInvalido {
  readonly codigo = 'dia_habil_inexistente';

  constructor(mes: string, numero: number) {
    super(`El mes ${mes} no tiene un día hábil número ${numero}.`);
  }
}

/** La cantidad de días hábiles a sumar no es un entero de cero en adelante. */
export class CantidadDeDiasInvalida extends DatoInvalido {
  readonly codigo = 'cantidad_de_dias_invalida';

  constructor(cantidad: number) {
    super(`La cantidad de días hábiles debe ser un entero de 0 en adelante (llegó ${cantidad}).`);
  }
}
