import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Un dato de la baja o de la venta no cumple sus reglas. */
export class BajaInvalida extends DatoInvalido {
  readonly codigo = 'baja_invalida';
}

/** La fecha de la baja es anterior al inicio de uso del activo. */
export class FechaDeBajaAnteriorAlUso extends ReglaDeNegocioInfringida {
  readonly codigo = 'fecha_de_baja_anterior_al_uso';

  constructor(codigoDelActivo: string, inicioDeUso: string) {
    super(`El activo ${codigoDelActivo} empezó a usarse el ${inicioDeUso}: la baja no puede ser anterior.`, {
      codigoDelActivo,
      inicioDeUso,
    });
  }
}

/** La causa no corresponde al tipo de bien (devolver al dueño es solo de bienes de terceros; vender o donar, no). */
export class CausaDeBajaNoPermitida extends ReglaDeNegocioInfringida {
  readonly codigo = 'causa_de_baja_no_permitida';
}

/** La baja ya está anulada. */
export class BajaNoAnulable extends ReglaDeNegocioInfringida {
  readonly codigo = 'baja_no_anulable';

  constructor() {
    super('La baja ya está anulada.');
  }
}

/** La baja está anulada: ya no admite documentos. */
export class BajaAnulada extends ReglaDeNegocioInfringida {
  readonly codigo = 'baja_anulada';

  constructor() {
    super('La baja está anulada: ya no admite el acta ni la denuncia.');
  }
}

/** Un componente que se dio de baja junto con su principal se anula con la baja del principal. */
export class BajaDeComponenteConSuPrincipal extends ReglaDeNegocioInfringida {
  readonly codigo = 'baja_de_componente_con_su_principal';

  constructor(codigoDelPrincipal: string) {
    super(`Este componente se dio de baja junto con ${codigoDelPrincipal}: anule la baja del activo principal.`, {
      codigoDelPrincipal,
    });
  }
}

/** Dar de baja solo una parte de un grupo exige dividirlo antes (AFI-6). */
export class BajaParcialNoDisponible extends ReglaDeNegocioInfringida {
  readonly codigo = 'baja_parcial_no_disponible';

  constructor(codigoDelActivo: string) {
    super(`La baja de solo una parte de las unidades de ${codigoDelActivo} todavía no está disponible.`, {
      codigoDelActivo,
    });
  }
}

/** El precio de una venta con componentes no alcanza para repartirlo entre los activos. */
export class PrecioNoRepartible extends ReglaDeNegocioInfringida {
  readonly codigo = 'precio_no_repartible';

  constructor() {
    super('El precio es tan pequeño que no alcanza un centavo por cada activo vendido junto con sus componentes.');
  }
}
