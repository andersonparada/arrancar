import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { montoLegible } from '../../core/compartido/dominio/monto-legible.js';

const enQuetzales = (centavos: number): string => montoLegible(deCentavos(centavos));

/** La fecha del vale (o de su liquidación) no es futura ni anterior a la apertura del fondo o a la entrega. */
export class FechaDelValeInvalida extends DatoInvalido {
  readonly codigo = 'fecha_del_vale_invalida';

  constructor(detalle: string) {
    super(detalle, { campo: 'fecha' });
  }
}

/** El vale lleva el nombre de quien recibe el efectivo, o un usuario activo de la empresa. */
export class ReceptorDelValeObligatorio extends DatoInvalido {
  readonly codigo = 'receptor_del_vale_obligatorio';

  constructor() {
    super('Escriba a quién se entrega el efectivo.', { campo: 'entregadoA' });
  }
}

/** El usuario escogido para recibir el vale debe estar activo y entrar a la empresa. */
export class ReceptorDelValeInvalido extends DatoInvalido {
  readonly codigo = 'receptor_del_vale_invalido';

  constructor() {
    super('Ese usuario no está activo o no entra a esta empresa.', { campo: 'entregadoAUsuarioId' });
  }
}

/** El monto del vale es mayor que el efectivo que hay en la caja del fondo. */
export class ValeMayorQueElEfectivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'vale_mayor_que_el_efectivo';

  constructor(esperadoCentavos: number, montoCentavos: number) {
    super(
      `El fondo tiene ${enQuetzales(esperadoCentavos)} en efectivo y el vale es de ${enQuetzales(montoCentavos)}: no alcanza.`,
    );
  }
}

/** Solo un vale abierto se liquida o se anula. */
export class ValeNoEstaAbierto extends ReglaDeNegocioInfringida {
  readonly codigo = 'vale_no_esta_abierto';

  constructor(numero: number, estado: string) {
    super(`El vale ${numero} ya está ${estado}.`);
  }
}

/** Un vale con comprobantes no se anula. */
export class ValeConComprobantes extends ReglaDeNegocioInfringida {
  readonly codigo = 'vale_con_comprobantes';

  constructor(numero: number) {
    super(`El vale ${numero} ya tiene comprobantes: no se puede anular.`);
  }
}

/** Un comprobante con el que se liquidó un vale provisional no vuelve a la bandeja. */
export class ComprobanteDeUnVale extends ReglaDeNegocioInfringida {
  readonly codigo = 'comprobante_de_un_vale';

  constructor(etiqueta: string) {
    super(`El comprobante ${etiqueta} se usó para liquidar un vale provisional: no vuelve a la bandeja.`);
  }
}

/** Las notas de crédito de la liquidación superan lo que gastó el vale: no compensan un gasto del mismo vale. */
export class NotasDeCreditoSinGasto extends ReglaDeNegocioInfringida {
  readonly codigo = 'notas_de_credito_sin_gasto';

  constructor(gastadoCentavos: number) {
    super(
      `Las notas de crédito superan en ${enQuetzales(-gastadoCentavos)} lo gastado en la liquidación: ` +
        'deben llegar junto con la factura que compensan.',
    );
  }
}
