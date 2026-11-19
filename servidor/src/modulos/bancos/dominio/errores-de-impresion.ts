import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Los errores de la impresión de cheques y de los formatos (`docs/modulos/diseno-impresion-de-cheques.md`). */

export class ChequeImpresoNoSeBlanquea extends ReglaDeNegocioInfringida {
  readonly codigo = 'cheque_impreso_no_se_blanquea';

  constructor() {
    super(
      'El cheque ya se imprimió: no se blanquea. Si el papel quedó inservible, páselo a otro formulario o anúlelo.',
    );
  }
}

export class AbonoEnCuentaSoloEnCheque extends DatoInvalido {
  readonly codigo = 'abono_en_cuenta_solo_en_cheque';

  constructor() {
    super('«Para abono en cuenta» solo se puede poner en un cheque.', { campo: 'paraAbonoEnCuenta' });
  }
}

export class ChequeImpresoNoSeCorrige extends ReglaDeNegocioInfringida {
  readonly codigo = 'cheque_impreso_no_se_corrige';

  constructor() {
    super('El cheque ya se imprimió: el papel dice lo que dice y sus condiciones ya no se corrigen.');
  }
}

export class ChequeNoEstaEmitido extends ReglaDeNegocioInfringida {
  readonly codigo = 'cheque_no_esta_emitido';

  constructor() {
    super('El cheque no está emitido.');
  }
}

export class ChequeYaImpreso extends ReglaDeNegocioInfringida {
  readonly codigo = 'cheque_ya_impreso';

  constructor(numero: number) {
    super(`El cheque ${numero} ya se imprimió: use «Reimprimir».`);
  }
}

export class ChequeNoImprimible extends ReglaDeNegocioInfringida {
  readonly codigo = 'cheque_no_imprimible';

  constructor(motivo: string) {
    super(motivo);
  }
}

export class ChequeSinImprimirNoSeReimprime extends ReglaDeNegocioInfringida {
  readonly codigo = 'cheque_sin_imprimir_no_se_reimprime';

  constructor(numero: number) {
    super(`El cheque ${numero} todavía no se imprimió: use «Imprimir».`);
  }
}

export class MotivoDeImpresionInvalido extends DatoInvalido {
  readonly codigo = 'motivo_de_impresion_invalido';

  constructor() {
    super('Escriba el motivo de la reimpresión (hasta 300 caracteres).', { campo: 'motivo' });
  }
}

export class ChequeraSinFormatoDeImpresion extends ReglaDeNegocioInfringida {
  readonly codigo = 'chequera_sin_formato_de_impresion';

  constructor(chequera: string) {
    super(`La chequera ${chequera} no tiene formato de impresión: elíjalo en la chequera antes de imprimir.`);
  }
}

export class LoteDeChequesInvalido extends DatoInvalido {
  readonly codigo = 'lote_de_cheques_invalido';
}

export class BeneficiarioNoCabe extends ReglaDeNegocioInfringida {
  readonly codigo = 'beneficiario_no_cabe';

  constructor() {
    super('El nombre del beneficiario no cabe en el cheque ni con la letra más chica: ajuste el formato.');
  }
}

export class MontoEnNumerosNoCabe extends ReglaDeNegocioInfringida {
  readonly codigo = 'monto_en_numeros_no_cabe';

  constructor() {
    super('El monto en números no cabe en el renglón del formato: ajuste el formato.');
  }
}

export class MontoEnLetrasNoCabe extends ReglaDeNegocioInfringida {
  readonly codigo = 'monto_en_letras_no_cabe';

  constructor() {
    super('El monto en letras no cabe en los renglones del formato: ajuste el formato.');
  }
}

export class CampoDelFormatoFaltante extends ReglaDeNegocioInfringida {
  readonly codigo = 'campo_del_formato_faltante';

  constructor(campo: string) {
    super(`El formato no tiene dónde poner ${campo}: agréguelo en el formato.`);
  }
}

export class FormatoDeChequeDañado extends ReglaDeNegocioInfringida {
  readonly codigo = 'formato_de_cheque_danado';

  constructor(nombre: string) {
    super(`El formato «${nombre}» tiene datos inválidos: corríjalo antes de imprimir.`);
  }
}

export class FormatoDeChequeInvalido extends DatoInvalido {
  readonly codigo = 'formato_de_cheque_invalido';
}

export class FormatoDeChequeEnUso extends ReglaDeNegocioInfringida {
  readonly codigo = 'formato_de_cheque_en_uso';

  constructor() {
    super('Hay chequeras que usan este formato: inactívelo en vez de eliminarlo.');
  }
}

export class NombreDeFormatoRepetido extends ReglaDeNegocioInfringida {
  readonly codigo = 'nombre_de_formato_repetido';

  constructor() {
    super('Ya hay un formato de cheque con ese nombre.');
  }
}

export class FormatoDeChequeInactivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'formato_de_cheque_inactivo';

  constructor() {
    super('El formato de cheque está inactivo.');
  }
}

export class ConfirmacionDeCustodiaFaltante extends ReglaDeNegocioInfringida {
  readonly codigo = 'confirmacion_de_custodia_faltante';

  constructor() {
    super(
      'Confirme que el formulario está en poder de la empresa y que lo conservó cruzado y sin zona de firma; si no, anúlelo como extraviado.',
    );
  }
}

export class ChequeNoSePasaDeFormulario extends ReglaDeNegocioInfringida {
  readonly codigo = 'cheque_no_se_pasa_de_formulario';
}

export class CausaDeAnulacionNoPermitida extends DatoInvalido {
  readonly codigo = 'causa_de_anulacion_no_permitida';

  constructor() {
    super('Por esta vía solo se puede anular como manual o como extraviado.', { campo: 'causa' });
  }
}
