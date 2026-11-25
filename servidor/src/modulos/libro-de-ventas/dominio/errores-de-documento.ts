import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** La empresa no tiene datos fiscales guardados para el mes: no se supone ningún régimen. */
export class EmpresaSinDatosFiscales extends ReglaDeNegocioInfringida {
  readonly codigo = 'empresa_sin_datos_fiscales';

  constructor() {
    super('La empresa no tiene datos fiscales para ese mes: llénelos en Libro de compras antes de registrar ventas.');
  }
}

/** Las ventas llevan el NIT de la empresa como emisor. */
export class EmpresaSinNit extends ReglaDeNegocioInfringida {
  readonly codigo = 'empresa_sin_nit';

  constructor() {
    super('La empresa no tiene NIT: regístrelo en los datos de la empresa antes de registrar ventas.');
  }
}

/** El documento es de antes de la fecha de inicio de la empresa: va como saldo inicial. */
export class DocumentoAnteriorALaFechaDeInicio extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_anterior_a_la_fecha_de_inicio';

  constructor(fechaDeInicio: string) {
    super(
      `El documento es anterior a la fecha de inicio de la empresa (${fechaDeInicio}): cárguelo como saldo inicial en Cuentas por cobrar.`,
    );
  }
}

/** El régimen del mes (o la familia del documento) fue derogado por el Decreto 31-2024 antes de la fecha del documento. */
export class RegimenDerogado extends ReglaDeNegocioInfringida {
  readonly codigo = 'regimen_derogado';

  constructor() {
    super('Ese régimen fue derogado por el Decreto 31-2024; actualice los datos fiscales de la empresa.');
  }
}

/** El tipo de documento no se dijo ni se deduce del código de la SAT. */
export class TipoDeDocumentoObligatorio extends DatoInvalido {
  readonly codigo = 'tipo_de_documento_obligatorio';

  constructor() {
    super('Diga el tipo del documento (o el código de la SAT).');
  }
}

export class TipoDteIncoherente extends DatoInvalido {
  readonly codigo = 'tipo_dte_incoherente';

  constructor(tipoDte: string, tipo: string) {
    super(`El código ${tipoDte} de la SAT no corresponde al tipo de documento «${tipo}».`);
  }
}

export class TipoDteObligatorio extends DatoInvalido {
  readonly codigo = 'tipo_dte_obligatorio';

  constructor() {
    super('Un documento con FEL lleva el código de la SAT (FACT, NCRE…).');
  }
}

export class TipoDteSinFel extends DatoInvalido {
  readonly codigo = 'tipo_dte_sin_fel';

  constructor() {
    super('Un documento sin FEL (papel) no lleva el código de la SAT.');
  }
}

/** Solo la venta a consumidor final se registra sin cliente. */
export class ClienteObligatorio extends DatoInvalido {
  readonly codigo = 'cliente_obligatorio';

  constructor() {
    super('Escoja el cliente: solo la venta a consumidor final (CF) va sin cliente.');
  }
}

export class ReceptorInvalido extends DatoInvalido {
  readonly codigo = 'receptor_invalido';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

/** Una línea no se puede calcular (monto, clase fiscal o IVA). */
export class LineaInvalida extends DatoInvalido {
  readonly codigo = 'linea_invalida';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

/** El IVA del DTE se aparta del calculado más de lo que se tolera. */
export class CorreccionDeIvaExcedida extends DatoInvalido {
  readonly codigo = 'correccion_de_iva_excedida';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

/** Los datos del documento se contradicen (fechas, destino, nota sin factura…). */
export class DocumentoInvalido extends DatoInvalido {
  readonly codigo = 'documento_invalido';

  constructor(mensaje: string, detalles?: unknown) {
    super(mensaje, detalles);
  }
}

/** La nota cita una factura del sistema anterior sin IVA en el DTE y sin historial fiscal del mes de esa factura. */
export class IvaDeLaNotaRequerido extends DatoInvalido {
  readonly codigo = 'iva_de_la_nota_requerido';

  constructor() {
    super(
      'No se sabe si la factura del sistema anterior llevaba IVA: escriba el IVA que dice la nota (0 si no lleva).',
      { campo: 'ivaDelDte' },
    );
  }
}
