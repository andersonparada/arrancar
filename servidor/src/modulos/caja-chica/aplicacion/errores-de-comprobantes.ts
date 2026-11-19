import { AccesoDenegado } from '../../core/compartido/aplicacion/errores.js';
import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import { montoLegible } from '../../core/compartido/dominio/monto-legible.js';

const enQuetzales = (centavos: number): string => montoLegible(deCentavos(centavos));

/** El comprobante pasa del tope y quien lo asigna no tiene el permiso de excepción. */
export class ComprobanteSobreElTope extends AccesoDenegado {
  override readonly codigo = 'comprobante_sobre_el_tope';

  constructor(datos: { etiqueta: string; montoCentavos: number; topeCentavos: number }) {
    super(
      `El comprobante ${datos.etiqueta} es de ${enQuetzales(datos.montoCentavos)} y el tope es de ${enQuetzales(datos.topeCentavos)}: para asignarlo hace falta el permiso de excepción.`,
    );
  }
}

/** El vale de gasto pasa de su tope y quien lo registra no tiene el permiso de excepción. */
export class ValeDeGastoSobreElTope extends AccesoDenegado {
  override readonly codigo = 'vale_de_gasto_sobre_el_tope';

  constructor(topeCentavos: number) {
    super(
      `El vale de gasto pasa del tope de ${enQuetzales(topeCentavos)}: para registrarlo hace falta el permiso de excepción.`,
    );
  }
}

/** Una factura con retención no entra a un fondo sin el permiso de excepción de quien la asigna. */
export class RetencionSinPermiso extends AccesoDenegado {
  override readonly codigo = 'retencion_sin_permiso';

  constructor(datos: { etiqueta: string; retenidoCentavos: number }) {
    super(
      `La factura ${datos.etiqueta} lleva retención de ${enQuetzales(datos.retenidoCentavos)}: para pagarla del fondo hace falta el permiso de excepción. Queda en la bandeja.`,
    );
  }
}
