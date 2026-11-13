import { fechaLegible, quetzales } from './avisos.js';
import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Un dato de la solicitud que no cumple su regla; `detalles.campo` dice cuál. */
abstract class DatoDeSaldoInicialInvalido extends DatoInvalido {
  constructor(mensaje: string, campo: string) {
    super(mensaje, { campo });
  }
}

export class FechaDeInicioSinRegistrar extends ReglaDeNegocioInfringida {
  readonly codigo = 'fecha_de_inicio_sin_registrar';

  constructor() {
    super(
      'Registre la fecha de inicio de la empresa (Empresas → Fecha de inicio y carga inicial) antes de cargar saldos iniciales.',
    );
  }
}

export class CargaInicialCerradaParaSaldos extends ReglaDeNegocioInfringida {
  readonly codigo = 'carga_inicial_cerrada_para_saldos';

  constructor() {
    super(
      'La carga inicial de la empresa está cerrada: reábrala en Empresas para agregar, corregir o eliminar saldos iniciales.',
    );
  }
}

export class EmisionNoAnteriorAlInicio extends DatoDeSaldoInicialInvalido {
  readonly codigo = 'emision_no_anterior_al_inicio';

  constructor(fechaDeInicio: string) {
    super(
      `Un saldo inicial es un documento registrado en el sistema anterior, emitido antes de la fecha de inicio (${fechaLegible(fechaDeInicio)}). Lo emitido desde esa fecha, o lo que no se registró en el sistema anterior, va al Libro de compras.`,
      'fechaEmision',
    );
  }
}

export class EmisionDemasiadoAntigua extends DatoDeSaldoInicialInvalido {
  readonly codigo = 'emision_demasiado_antigua';

  constructor(fechaMinima: string) {
    super(
      `La fecha de emisión no puede ser de más de 10 años antes de la fecha de inicio: debe ser el ${fechaLegible(fechaMinima)} o posterior. Revise que no haya un error de digitación.`,
      'fechaEmision',
    );
  }
}

export class SaldoPendienteInvalido extends DatoDeSaldoInicialInvalido {
  readonly codigo = 'saldo_pendiente_invalido';

  constructor(maximoCentavos: number) {
    super(
      `El saldo pendiente es lo que falta pagarle al proveedor, sin retenciones: debe ser mayor que cero y no pasar del total menos las retenciones (${quetzales(maximoCentavos)}).`,
      'saldoPendiente',
    );
  }
}

export class RetencionesInvalidas extends DatoDeSaldoInicialInvalido {
  readonly codigo = 'retenciones_invalidas';

  constructor() {
    super(
      'Las retenciones (todas las del documento) no pueden pasar del total; una nota de crédito no lleva retenciones.',
      'retenciones',
    );
  }
}

export class RetencionesPorPracticarInvalidas extends DatoDeSaldoInicialInvalido {
  readonly codigo = 'retenciones_por_practicar_invalidas';

  constructor(retencionesCentavos: number) {
    super(
      `Las retenciones por practicar son parte de las retenciones del documento: no pueden pasar de ${quetzales(retencionesCentavos)}.`,
      'retencionesPorPracticar',
    );
  }
}

export class TotalInvalido extends DatoDeSaldoInicialInvalido {
  readonly codigo = 'total_invalido';

  constructor() {
    super('El total del documento debe ser mayor que cero.', 'total');
  }
}

export class NumeroDeDocumentoInvalido extends DatoDeSaldoInicialInvalido {
  readonly codigo = 'numero_de_documento_invalido';
}

export class ReferenciaInvalida extends DatoDeSaldoInicialInvalido {
  readonly codigo = 'referencia_invalida';

  constructor() {
    super('La referencia del sistema anterior admite hasta 60 caracteres.', 'referencia');
  }
}

export class ProveedorNoDisponible extends DatoDeSaldoInicialInvalido {
  readonly codigo = 'proveedor_no_disponible';

  constructor() {
    super('Ese proveedor no existe o está inactivo.', 'proveedorId');
  }
}

export class SaldoInicialAutorizado extends ReglaDeNegocioInfringida {
  readonly codigo = 'saldo_inicial_autorizado';

  constructor(etiqueta: string) {
    super(`El saldo inicial ${etiqueta} ya está autorizado: desautorícelo para corregirlo o eliminarlo.`);
  }
}

export class SaldoInicialConMovimientos extends ReglaDeNegocioInfringida {
  readonly codigo = 'saldo_inicial_con_movimientos';

  constructor(etiqueta: string) {
    super(
      `El saldo inicial ${etiqueta} ya tiene notas aplicadas (o está en una contraseña, o tiene pagos): no se corrige ni se elimina.`,
    );
  }
}

/** Cambiar la fecha de inicio dejaría saldos iniciales emitidos desde la fecha nueva (la usa el aviso del paso U8-6). */
export class SaldosInicialesPosterioresALaFecha extends ReglaDeNegocioInfringida {
  readonly codigo = 'saldos_iniciales_posteriores_a_la_fecha';

  constructor(cantidad: number) {
    super(
      `Hay ${cantidad} saldos iniciales de Cuentas por pagar emitidos desde esa fecha: corríjalos o elimínelos antes de cambiar la fecha de inicio.`,
    );
  }
}
