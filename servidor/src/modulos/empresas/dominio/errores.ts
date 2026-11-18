import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

export class NombreDeEmpresaInvalido extends DatoInvalido {
  readonly codigo = 'nombre_de_empresa_invalido';

  constructor(nombre: string) {
    super(`El nombre "${nombre}" no es válido: escriba de 1 a 120 caracteres.`);
  }
}

export class NoSePuedeDesactivarLaEmpresaEnUso extends ReglaDeNegocioInfringida {
  readonly codigo = 'empresa_en_uso';

  constructor() {
    super('No puede desactivar la empresa con la que está trabajando.');
  }
}

export class RazonSocialInvalida extends DatoInvalido {
  readonly codigo = 'razon_social_invalida';

  constructor() {
    super('La razón social no es válida: escriba de 1 a 200 caracteres.');
  }
}

export class NombreComercialInvalido extends DatoInvalido {
  readonly codigo = 'nombre_comercial_invalido';

  constructor() {
    super('El nombre comercial no es válido: escriba de 1 a 200 caracteres.');
  }
}

export class FechaDeInicioInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_inicio_invalida';

  constructor(fecha: string) {
    super(`La fecha de inicio "${fecha}" no es válida: use el formato aaaa-mm-dd.`);
  }
}

export class MotivoDeReaperturaInvalido extends DatoInvalido {
  readonly codigo = 'motivo_de_reapertura_invalido';

  constructor() {
    super('Escriba el motivo de la reapertura (de 1 a 500 caracteres).');
  }
}

export class CargaInicialCerrada extends ReglaDeNegocioInfringida {
  readonly codigo = 'carga_inicial_cerrada';

  constructor() {
    super('La carga inicial está cerrada: reábrala para cambiar su fecha de inicio.');
  }
}

export class CargaInicialAbierta extends ReglaDeNegocioInfringida {
  readonly codigo = 'carga_inicial_abierta';

  constructor() {
    super('La carga inicial está abierta: no hay nada que reabrir.');
  }
}

export class FechaDeInicioRequerida extends ReglaDeNegocioInfringida {
  readonly codigo = 'fecha_de_inicio_requerida';

  constructor() {
    super('Registre primero la fecha de inicio de la empresa para poder cerrar su carga inicial.');
  }
}

export class MotivoDeCierreInvalido extends DatoInvalido {
  readonly codigo = 'motivo_de_cierre_invalido';

  constructor() {
    super('El motivo del cierre no es válido: escriba de 1 a 500 caracteres.');
  }
}

/** Algún módulo encontró diferencias: para cerrar hay que escribir el motivo. `detalles` lleva la revisión. */
export class MotivoDeCierreRequerido extends ReglaDeNegocioInfringida {
  readonly codigo = 'motivo_de_cierre_requerido';

  constructor(revision: unknown) {
    super('La revisión encontró diferencias: escriba el motivo para cerrar la carga inicial.', revision);
  }
}

/** Los saldos cambiaron entre que se revisó y se confirmó el cierre. `detalles` lleva la revisión nueva. */
export class RevisionDeCierreDesactualizada extends ReglaDeNegocioInfringida {
  readonly codigo = 'revision_de_cierre_desactualizada';

  constructor(revision: unknown) {
    super('Los saldos cambiaron mientras revisaba: vuelva a revisar antes de cerrar.', revision);
  }
}

export class BalanceDeAperturaNoEsPdf extends DatoInvalido {
  readonly codigo = 'balance_de_apertura_no_es_pdf';

  constructor() {
    super('Adjunte el balance en PDF; si lo tiene en papel, escanéelo como PDF.');
  }
}

export class BalanceDeAperturaFijo extends ReglaDeNegocioInfringida {
  readonly codigo = 'balance_de_apertura_fijo';

  constructor() {
    super('Con la carga cerrada no se puede quitar ni reemplazar el balance de apertura: reábrala primero.');
  }
}
