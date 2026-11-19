import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { montoLegible } from '../../core/compartido/dominio/monto-legible.js';

const enQuetzales = (centavos: number): string => montoLegible(deCentavos(centavos));

/** El movimiento del fondo no puede tener fecha futura. */
export class FechaDelFondoInvalida extends DatoInvalido {
  readonly codigo = 'fecha_del_fondo_invalida';

  constructor() {
    super('La fecha no puede ser futura.', { campo: 'fecha' });
  }
}

/** El nuevo custodio no puede empezar antes que el actual. */
export class FechaDelCustodioInvalida extends DatoInvalido {
  readonly codigo = 'fecha_del_custodio_invalida';

  constructor(desde: string) {
    const [anio, mes, dia] = desde.split('-');
    super(`La fecha no puede ser anterior al inicio del custodio actual (${dia}/${mes}/${anio}).`, { campo: 'fecha' });
  }
}

/** El dinero que se entrega o se devuelve es un monto mayor que cero. */
export class MontoDelFondoInvalido extends DatoInvalido {
  readonly codigo = 'monto_del_fondo_invalido';

  constructor() {
    super('Escriba el monto: debe ser mayor que cero.', { campo: 'monto' });
  }
}

export class NombreDelFondoInvalido extends DatoInvalido {
  readonly codigo = 'nombre_del_fondo_invalido';

  constructor() {
    super('Escriba el nombre del fondo (hasta 80 letras).', { campo: 'nombre' });
  }
}

export class TopeDelFondoInvalido extends DatoInvalido {
  readonly codigo = 'tope_del_fondo_invalido';

  constructor() {
    super('El tope por comprobante debe ser mayor que cero.', { campo: 'topePorComprobante' });
  }
}

/** El fondo dice quién lleva el efectivo: un nombre o un usuario de la empresa. */
export class CustodioObligatorio extends DatoInvalido {
  readonly codigo = 'custodio_obligatorio';

  constructor() {
    super('Escriba quién lleva el efectivo (hasta 150 letras) o escoja un usuario.', { campo: 'custodio' });
  }
}

/** El usuario escogido como custodio debe estar activo y entrar a la empresa. */
export class CustodioInvalido extends DatoInvalido {
  readonly codigo = 'custodio_invalido';

  constructor() {
    super('Ese usuario no está activo o no entra a esta empresa.', { campo: 'custodioUsuarioId' });
  }
}

/** El cheque lleva un nombre (el custodio o la empresa): nunca se emite al portador. */
export class BeneficiarioInvalido extends DatoInvalido {
  readonly codigo = 'beneficiario_invalido';

  constructor() {
    super('Escriba a nombre de quién va el cheque (el custodio o la empresa); no se emite al portador.', {
      campo: 'beneficiario',
    });
  }
}

/** El depósito necesita la cuenta bancaria donde se hace. */
export class CuentaDelDepositoObligatoria extends DatoInvalido {
  readonly codigo = 'cuenta_del_deposito_obligatoria';

  constructor() {
    super('Escoja la cuenta bancaria del depósito: el fondo no tiene una por omisión.', {
      campo: 'cuentaBancariaId',
    });
  }
}

/** Un fondo cerrado no admite más cambios (se abre otro). */
export class FondoNoDisponible extends ReglaDeNegocioInfringida {
  readonly codigo = 'fondo_no_disponible';

  constructor() {
    super('El fondo está cerrado: no admite cambios.');
  }
}

/** No se puede devolver más efectivo del que debe haber en la caja. */
export class DisminucionMayorQueElEfectivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'disminucion_mayor_que_el_efectivo';

  constructor(esperadoCentavos: number) {
    super(`Solo hay ${enQuetzales(esperadoCentavos)} de efectivo esperado en el fondo: no puede devolver más.`, {
      campo: 'monto',
    });
  }
}

/** Para dejar el fondo en cero se cierra; disminuir deja siempre algo. */
export class DisminucionDejaElFondoEnCero extends ReglaDeNegocioInfringida {
  readonly codigo = 'disminucion_deja_el_fondo_en_cero';

  constructor() {
    super('La disminución deja el fondo en cero: para llegar a cero cierre el fondo.', { campo: 'monto' });
  }
}

/** El fondo ya tiene comprobantes, arqueos, vales, reposiciones u otros cambios de monto vigentes. */
export class FondoConMovimientos extends ReglaDeNegocioInfringida {
  readonly codigo = 'fondo_con_movimientos';

  constructor(detalle: string) {
    super(`El fondo ya tiene ${detalle}: no se puede anular su apertura.`);
  }
}

/** La apertura del fondo ya está anulada. */
export class AperturaYaAnulada extends ReglaDeNegocioInfringida {
  readonly codigo = 'apertura_ya_anulada';

  constructor() {
    super('La apertura de este fondo ya está anulada.');
  }
}

/** El cheque o la nota es de un fondo: se corrige desde Caja chica, no desde Bancos. */
export class MovimientoDeCajaChica extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_de_caja_chica';

  constructor(detalle = 'Ese movimiento es de un fondo de Caja chica: corríjalo desde Caja chica.') {
    super(detalle);
  }
}

/** El aumento o la disminución no puede ser anterior a la apertura del fondo. */
export class FechaAnteriorALaApertura extends DatoInvalido {
  readonly codigo = 'fecha_anterior_a_la_apertura';

  constructor(apertura: string) {
    const [anio, mes, dia] = apertura.split('-');
    super(`La fecha no puede ser anterior a la apertura del fondo (${dia}/${mes}/${anio}).`, { campo: 'fecha' });
  }
}

/** Anular un aumento dejaría el fondo (o su efectivo esperado) en cero o en negativo. */
export class AnulacionDejaElFondoSinMonto extends ReglaDeNegocioInfringida {
  readonly codigo = 'anulacion_deja_el_fondo_sin_monto';

  constructor() {
    super(
      'No se puede anular el aumento: el fondo se quedaría sin monto o sin efectivo suficiente por las disminuciones posteriores.',
    );
  }
}
