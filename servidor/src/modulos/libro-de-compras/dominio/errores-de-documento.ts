import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** La empresa no tiene NIT: sin él no se sabe a quién se emite el documento ni se puede validar la FEL. */
export class EmpresaSinNit extends ReglaDeNegocioInfringida {
  readonly codigo = 'empresa_sin_nit';

  constructor() {
    super('La empresa no tiene NIT. Escríbalo en los datos de la empresa para registrar documentos.');
  }
}

/** El proveedor está inactivo (él o su papel de proveedor): no se le registran documentos nuevos. */
export class ProveedorInactivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'proveedor_inactivo';

  constructor() {
    super('El proveedor está inactivo: actívelo para registrarle documentos.');
  }
}

/** El tipo de factura no corresponde al régimen del proveedor (pequeño contribuyente o general). */
export class TipoNoCorrespondeAlProveedor extends ReglaDeNegocioInfringida {
  readonly codigo = 'tipo_no_corresponde_al_proveedor';
}

/** Un recibo no es un documento FEL: solo va con la casilla «Se muestra en reportes SAT» desmarcada. */
export class ReciboDebeQuedarFueraDelLibro extends DatoInvalido {
  readonly codigo = 'recibo_debe_quedar_fuera_del_libro';

  constructor() {
    super('Un recibo no va en el libro: elija por qué queda fuera de los reportes SAT.');
  }
}

/** Un documento del libro necesita el NIT del emisor, la serie y la autorización de la FEL. */
export class DatosDeLaFelIncompletos extends DatoInvalido {
  readonly codigo = 'datos_de_la_fel_incompletos';
}

/** El NIT del emisor del documento no es válido o es consumidor final. */
export class NitDelEmisorInvalido extends DatoInvalido {
  readonly codigo = 'nit_del_emisor_invalido';
}

/** El proveedor ya tiene otro NIT: el documento no es de él o el NIT está mal escrito. */
export class NitDelEmisorNoCoincide extends ReglaDeNegocioInfringida {
  readonly codigo = 'nit_del_emisor_no_coincide';

  constructor() {
    super('El NIT del emisor no coincide con el del proveedor. Revise el documento o elija otro proveedor.');
  }
}

/** Una línea no cumple las reglas (concepto, tipo, activo fijo o combustible). */
export class LineaDeDocumentoInvalida extends DatoInvalido {
  readonly codigo = 'linea_de_documento_invalida';
}

/** Un catálogo (concepto de gasto o combustible) está inactivo y no se puede usar en documentos nuevos. */
export class CatalogoInactivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'catalogo_inactivo';
}

/** La nota de crédito no trae la factura que rebaja, o un documento que no es nota trae una factura afectada. */
export class FacturaAfectadaIncoherente extends DatoInvalido {
  readonly codigo = 'factura_afectada_incoherente';
}

/** La factura de la nota no es vigente, no es del mismo proveedor y destino, o no es una factura. */
export class FacturaNoSirveParaLaNota extends ReglaDeNegocioInfringida {
  readonly codigo = 'factura_no_sirve_para_la_nota';
}

/** Las notas de crédito vigentes de una factura, con la nueva, suman más que el total de la factura. */
export class NotaSuperaLaFactura extends ReglaDeNegocioInfringida {
  readonly codigo = 'nota_supera_la_factura';

  constructor() {
    super('Las notas de crédito no pueden sumar más que el total de la factura que rebajan.');
  }
}

/** El destino elegido no está instalado o no está activo en la cuenta. */
export class DestinoNoDisponible extends ReglaDeNegocioInfringida {
  readonly codigo = 'destino_no_disponible';

  constructor(destino: string) {
    super(`El destino "${destino}" no está activo en esta cuenta: actívelo para registrar documentos hacia él.`);
  }
}

/** Una retención ajustada no cumple las reglas (no se propuso, monto fuera de rango, repetida). */
export class AjusteDeRetencionInvalido extends DatoInvalido {
  readonly codigo = 'ajuste_de_retencion_invalido';
}

/** Cambiar el monto propuesto de una retención exige decir por qué. */
export class MotivoDelAjusteObligatorio extends DatoInvalido {
  readonly codigo = 'motivo_del_ajuste_obligatorio';

  constructor() {
    super('Escriba el motivo de cambiar el monto de la retención.');
  }
}
