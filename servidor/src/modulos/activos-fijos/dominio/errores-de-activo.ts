import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Un dato del activo no cumple sus reglas. */
export class ActivoInvalido extends DatoInvalido {
  readonly codigo = 'activo_invalido';
}

/** Los valores de matrícula y catastro solo existen en los edificios. */
export class ValorFiscalSoloEnEdificios extends DatoInvalido {
  readonly codigo = 'valor_fiscal_solo_en_edificios';

  constructor() {
    super('La matrícula y el catastro solo se escriben en los edificios.');
  }
}

/** Marcar un activo como ocioso exige decir por qué (NIIF para las Pymes 17.20; V-4 del dictamen). */
export class MotivoDeOcioRequerido extends DatoInvalido {
  readonly codigo = 'motivo_de_ocio_requerido';

  constructor() {
    super('Escriba el motivo por el que el activo está ocioso.');
  }
}

/** Un componente no puede tener sus propios componentes: el diseño admite un solo nivel. */
export class ComponenteDeUnComponente extends DatoInvalido {
  readonly codigo = 'componente_de_un_componente';

  constructor() {
    super('Un componente no puede tener componentes: elija como padre el activo principal.');
  }
}

/** El departamento es de una localidad distinta a la elegida. */
export class DepartamentoDeOtraLocalidad extends DatoInvalido {
  readonly codigo = 'departamento_de_otra_localidad';

  constructor() {
    super('Ese departamento pertenece a otra localidad. Elija uno de la localidad o de toda la empresa.');
  }
}

/** La fecha de adquisición es anterior a la fecha de inicio de la empresa en Arrancar. */
export class FechaAnteriorAlInicio extends DatoInvalido {
  readonly codigo = 'fecha_anterior_al_inicio';

  constructor(fechaDeInicio: string) {
    super(
      `La fecha de adquisición es anterior al inicio de la empresa (${fechaDeInicio}). Cárguelo como saldo inicial.`,
      { fechaDeInicio },
    );
  }
}

/** El activo ya tiene movimientos, costos o componentes: no se elimina. */
export class ActivoConMovimientos extends ReglaDeNegocioInfringida {
  readonly codigo = 'activo_con_movimientos';

  constructor() {
    super('El activo ya tiene movimientos o componentes. Anule lo que tiene antes de eliminarlo.');
  }
}

/** La acción solo se hace con un activo que está en uso. */
export class ActivoNoEnUso extends ReglaDeNegocioInfringida {
  readonly codigo = 'activo_no_en_uso';

  constructor() {
    super('Solo un activo en uso se marca como ocioso.');
  }
}

/** El activo ya está dado de baja y no se cambia. */
export class ActivoDadoDeBaja extends ReglaDeNegocioInfringida {
  readonly codigo = 'activo_dado_de_baja';

  constructor() {
    super('El activo está dado de baja y ya no se puede cambiar.');
  }
}
