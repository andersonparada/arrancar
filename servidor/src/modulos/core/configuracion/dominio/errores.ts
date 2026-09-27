import { DatoInvalido, ReglaDeNegocioInfringida } from '../../compartido/dominio/errores.js';

export class NivelNoPermitido extends ReglaDeNegocioInfringida {
  readonly codigo = 'nivel_no_permitido';

  constructor(nivel: string) {
    super(`Esta configuración no se puede fijar por ${nivel}.`);
  }
}

export class ValorDeConfiguracionInvalido extends DatoInvalido {
  readonly codigo = 'valor_de_configuracion_invalido';

  constructor(motivo: string | undefined) {
    super(`El valor no es válido para esta configuración${motivo ? `: ${motivo}` : '.'}`);
  }
}
