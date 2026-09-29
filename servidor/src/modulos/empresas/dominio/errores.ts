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
