import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { fechaLegible } from './avisos.js';

/** Un dato de la contraseña que no cumple su regla; `detalles.campo` dice cuál. */
abstract class DatoDeContrasenaInvalido extends DatoInvalido {
  constructor(mensaje: string, campo: string) {
    super(mensaje, { campo });
  }
}

export class ContrasenaSinCargos extends DatoDeContrasenaInvalido {
  readonly codigo = 'contrasena_sin_cargos';

  constructor() {
    super('Una contraseña lleva al menos una factura u otro cargo.', 'documentos');
  }
}

export class DemasiadosDocumentosEnContrasena extends DatoDeContrasenaInvalido {
  readonly codigo = 'demasiados_documentos_en_contrasena';

  constructor(maximo: number) {
    super(`Una contraseña lleva hasta ${maximo} documentos.`, 'documentos');
  }
}

export class DocumentosRepetidosEnContrasena extends DatoDeContrasenaInvalido {
  readonly codigo = 'documentos_repetidos_en_contrasena';

  constructor() {
    super('Un documento no puede estar dos veces en la misma contraseña.', 'documentos');
  }
}

export class DocumentoDeOtroProveedor extends DatoDeContrasenaInvalido {
  readonly codigo = 'documento_de_otro_proveedor';

  constructor(etiqueta: string) {
    super(`El documento ${etiqueta} es de otro proveedor.`, 'documentos');
  }
}

export class FechaDeContrasenaInvalida extends DatoDeContrasenaInvalido {
  readonly codigo = 'fecha_de_contrasena_invalida';

  constructor() {
    super(
      'La fecha no puede ser futura, ni anterior a la emisión de los documentos, ni anterior a la fecha de inicio de la empresa.',
      'fecha',
    );
  }
}

export class FechaDePagoInvalida extends DatoDeContrasenaInvalido {
  readonly codigo = 'fecha_de_pago_invalida';

  constructor(fecha: string) {
    super(
      `La fecha prometida de pago no puede ser anterior a la fecha de la contraseña (${fechaLegible(fecha)}).`,
      'fechaDePago',
    );
  }
}

export class ObservacionesDeContrasenaInvalidas extends DatoDeContrasenaInvalido {
  readonly codigo = 'observaciones_de_contrasena_invalidas';

  constructor(maximo: number) {
    super(`Las observaciones pueden tener hasta ${maximo} caracteres.`, 'observaciones');
  }
}

/** Por qué un documento no entra en una contraseña. */
export type MotivoDeNoDisponible = 'anulado' | 'sin_deuda' | 'sin_saldo_a_favor';

const TEXTO_DEL_MOTIVO: Record<MotivoDeNoDisponible, string> = {
  anulado: 'está anulado',
  sin_deuda: 'ya no debe nada',
  sin_saldo_a_favor: 'no tiene saldo a favor',
};

export class DocumentoNoDisponibleParaContrasena extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_no_disponible_para_contrasena';

  constructor(etiqueta: string, motivo: MotivoDeNoDisponible) {
    super(`El documento ${etiqueta} no entra en una contraseña: ${TEXTO_DEL_MOTIVO[motivo]}.`);
  }
}

export class DocumentoYaEnContrasena extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_ya_en_contrasena';

  constructor(etiqueta: string, numeroDeLaContrasena: string) {
    super(`El documento ${etiqueta} ya está en la contraseña ${numeroDeLaContrasena}.`);
  }
}

export class ContrasenaSinSaldo extends ReglaDeNegocioInfringida {
  readonly codigo = 'contrasena_sin_saldo';

  constructor() {
    super('Las notas de crédito cubren todo: no queda nada que pagar. Aplíquelas en Notas de crédito.');
  }
}
