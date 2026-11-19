import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { quetzales } from './avisos-de-anticipos.js';
import { fechaLegible } from './fechas.js';

/** Lo devuelto más lo no liquidado debe ser justo lo que falta por justificar; si se gastó de más, no se devuelve nada. */
export class LiquidacionNoCuadra extends DatoInvalido {
  readonly codigo = 'liquidacion_no_cuadra';

  constructor(porJustificarCentavos: number) {
    super(
      porJustificarCentavos < 0
        ? `Se gastó de más (${quetzales(-porJustificarCentavos)}): no se devuelve ni se deja sin liquidar nada, se reembolsa.`
        : `Lo devuelto más lo no liquidado debe sumar ${quetzales(porJustificarCentavos)}, lo que falta por justificar.`,
      { campo: 'devuelto' },
    );
  }
}

export class DestinoDeNoLiquidadoObligatorio extends DatoInvalido {
  readonly codigo = 'destino_de_no_liquidado_obligatorio';

  constructor() {
    super('Diga qué se hace con lo no liquidado: cobrarlo, tratarlo como renta del trabajo o como pérdida.', {
      campo: 'destinoDeNoLiquidado',
    });
  }
}

export class MotivoDeNoLiquidadoObligatorio extends DatoInvalido {
  readonly codigo = 'motivo_de_no_liquidado_obligatorio';

  constructor() {
    super('Escriba por qué queda algo sin liquidar (hasta 300 letras).', { campo: 'motivoDeNoLiquidado' });
  }
}

/** Solo a un empleado se le puede tratar lo no liquidado como renta del trabajo. */
export class RentaDelTrabajoSoloEmpleados extends ReglaDeNegocioInfringida {
  readonly codigo = 'renta_del_trabajo_solo_empleados';

  constructor() {
    super('Lo no liquidado solo puede ir a renta del trabajo si el beneficiario es empleado.');
  }
}

/** Descontar en pocas cuotas pesa sobre el salario: se piden 5 o más, salvo que el pago sea voluntario. */
export class CuotasInsuficientes extends DatoInvalido {
  readonly codigo = 'cuotas_insuficientes';

  constructor(minimo: number) {
    super(
      minimo > 1
        ? `Cobrar lo no liquidado pide ${minimo} cuotas o más, salvo que el pago sea voluntario.`
        : 'Escriba en cuántas cuotas se cobra lo no liquidado.',
      { campo: 'cuotas' },
    );
  }
}

/** Si se gastó de más, el reembolso sale de Bancos: hace falta decir cómo. */
export class ReembolsoSinMedioDePago extends DatoInvalido {
  readonly codigo = 'reembolso_sin_medio_de_pago';

  constructor() {
    super('Se gastó de más: escoja el cheque o la nota de débito con que se reembolsa.', { campo: 'reembolso' });
  }
}

export class FechaDeLiquidacionInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_liquidacion_invalida';

  constructor(minima: string) {
    super(`La liquidación no puede ser futura ni anterior al ${fechaLegible(minima)} (entrega o último gasto).`, {
      campo: 'fecha',
    });
  }
}

/** Solo un anticipo liquidado se reabre. */
export class AnticipoNoLiquidado extends ReglaDeNegocioInfringida {
  readonly codigo = 'anticipo_no_liquidado';

  constructor(numero: string) {
    super(`El anticipo ${numero} no está liquidado: no hay nada que reabrir.`);
  }
}
