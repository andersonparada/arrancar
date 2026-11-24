import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { fechaLegible, quetzales } from './avisos.js';

/** El pago ya estaba anulado: no se anula, reaplica ni se le salda una diferencia. */
export class PagoYaAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'pago_ya_anulado';

  constructor(numero: string) {
    super(`El pago ${numero} ya está anulado.`);
  }
}

/** El banco ya pagó el cheque (está conciliado): no se anula; se reaplica o se registra el reintegro. */
export class PagoCobrado extends ReglaDeNegocioInfringida {
  readonly codigo = 'pago_cobrado';

  constructor(numero: string) {
    super(
      `El cheque del pago ${numero} ya está conciliado (el banco lo pagó): no se anula. Si se aplicó a otros documentos, reaplíquelo; si el proveedor devolvió el dinero, regístrelo como reintegro.`,
    );
  }
}

/** Bancos quiere cambiar una nota que está aplicada a pagos: primero se anulan esos pagos. */
export class MovimientoLigadoAPagos extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_ligado_a_pagos';

  constructor(numero: string, contrasenas: readonly string[]) {
    const deLaContrasena = contrasenas.length === 0 ? '' : ` de la contraseña ${contrasenas.join(', ')}`;
    super(`La nota está aplicada al pago ${numero}${deLaContrasena}: anule primero ese pago en Cuentas por pagar.`);
  }
}

/** Lo que emitió Cuentas por pagar no se corrige ni se elimina en Bancos: se anula el pago desde aquí. */
export class MovimientoDeCuentasPorPagar extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_de_cuentas_por_pagar';

  constructor(numero: string) {
    super(`Lo emitió Cuentas por pagar (pago ${numero}): anule el pago desde allá.`);
  }
}

/** Un movimiento que tuvo pagos (hoy anulados) no se elimina en Bancos: la llave lo exige y el rastro se conserva. */
export class MovimientoConPagosAnulados extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_con_pagos_anulados';

  constructor() {
    super('Tuvo pagos en Cuentas por pagar: anúlelo en vez de eliminarlo.');
  }
}

/** Al reaplicar, el dinero del pago no cambia: la suma de los montos nuevos es la del pago. */
export class ReaplicacionConOtroMonto extends DatoInvalido {
  readonly codigo = 'reaplicacion_con_otro_monto';

  constructor(montoCentavos: number) {
    super(`Al reaplicar, la suma debe seguir siendo ${quetzales(montoCentavos)} (el monto del pago).`, {
      campo: 'aplicaciones',
    });
  }
}

/** La cuenta de apertura y el cheque de apertura solo cubren saldos iniciales. */
export class SoloSaldosIniciales extends ReglaDeNegocioInfringida {
  readonly codigo = 'solo_saldos_iniciales';

  constructor() {
    super('La cuenta de apertura y el cheque de apertura solo se usan con saldos iniciales.');
  }
}

/** La diferencia de un pago se salda desde la fecha del pago y hasta hoy. */
export class FechaDeDiferenciaInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_diferencia_invalida';

  constructor(minima: string) {
    super(`La fecha no puede ser futura ni anterior al pago (${fechaLegible(minima)}).`, { campo: 'fecha' });
  }
}
