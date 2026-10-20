import { DatoInvalido, ReglaDeNegocioInfringida } from '../../../core/compartido/dominio/errores.js';

const mes = (periodo: string): string => periodo.slice(0, 7);

/** No se declara un mes que no ha terminado. */
export class PeriodoSinTerminar extends ReglaDeNegocioInfringida {
  readonly codigo = 'periodo_sin_terminar';

  constructor(periodo: string) {
    super(`El período ${mes(periodo)} todavía no termina: solo se declaran meses completos.`, { campo: 'periodo' });
  }
}

/** Declarar un período que ya está declarado (con el bloqueo encendido) pide reabrirlo antes. */
export class PeriodoYaDeclarado extends ReglaDeNegocioInfringida {
  readonly codigo = 'periodo_ya_declarado';

  constructor(periodo: string) {
    super(`El período ${mes(periodo)} ya está declarado: reábralo, con su motivo, para declararlo de nuevo.`, {
      campo: 'periodo',
    });
  }
}

/** Reabrir un período que no está declarado. */
export class PeriodoNoDeclarado extends ReglaDeNegocioInfringida {
  readonly codigo = 'periodo_no_declarado';

  constructor(periodo: string) {
    super(`El período ${mes(periodo)} no está declarado.`, { campo: 'periodo' });
  }
}

/** La fecha de presentación no puede ser anterior al mes siguiente al período declarado. */
export class FechaDePresentacionInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_presentacion_invalida';

  constructor(primerDia: string) {
    super(`La fecha de presentación no puede ser anterior al ${primerDia}.`, { campo: 'fechaDePresentacion' });
  }
}

/** El número del formulario: de 1 a 40 letras o dígitos, y solo si el período se declara en un formulario. */
export class NumeroDeFormularioInvalido extends DatoInvalido {
  readonly codigo = 'numero_de_formulario_invalido';

  constructor(mensaje = 'El número del formulario lleva de 1 a 40 letras o dígitos, sin espacios.') {
    super(mensaje, { campo: 'numeroDeFormulario' });
  }
}

/** Reabrir o apagar el bloqueo exige decir por qué (hasta 500 caracteres, como la columna de la base). */
export class MotivoDelPeriodoInvalido extends DatoInvalido {
  readonly codigo = 'motivo_del_periodo_invalido';

  constructor() {
    super('Escriba el motivo (hasta 500 caracteres).', { campo: 'motivo' });
  }
}
