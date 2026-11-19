import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** El conteo trae una denominación que no existe, repetida o una cantidad que no es un entero. */
export class ConteoInvalido extends DatoInvalido {
  readonly codigo = 'conteo_invalido';

  constructor(detalle: string) {
    super(detalle, { campo: 'conteo' });
  }
}

/** El arqueo no es futuro ni anterior a la apertura del fondo. */
export class FechaDelArqueoInvalida extends DatoInvalido {
  readonly codigo = 'fecha_del_arqueo_invalida';

  constructor(detalle: string) {
    super(detalle, { campo: 'realizadoEn' });
  }
}

/** Con diferencia, el arqueo dice por qué (queda en el acta). */
export class MotivoDeDiferenciaObligatorio extends DatoInvalido {
  readonly codigo = 'motivo_de_diferencia_obligatorio';

  constructor() {
    super('Hay una diferencia: escriba el motivo.', { campo: 'motivoDeDiferencia' });
  }
}

/** Un faltante dice qué se hace con él: pérdida del fondo o cobro al custodio. */
export class DestinoDelFaltanteObligatorio extends DatoInvalido {
  readonly codigo = 'destino_del_faltante_obligatorio';

  constructor() {
    super('Hay un faltante: diga si se asume como pérdida o se le cobra al custodio.', { campo: 'destinoDelFaltante' });
  }
}

/** Sin diferencia no hay motivo, y el destino es solo de los faltantes: no se guarda lo que no aplica. */
export class DatoDeDiferenciaQueNoAplica extends DatoInvalido {
  readonly codigo = 'dato_de_diferencia_que_no_aplica';

  constructor(campo: 'motivoDeDiferencia' | 'destinoDelFaltante') {
    super(
      campo === 'motivoDeDiferencia'
        ? 'No hay diferencia: no escriba un motivo.'
        : 'El destino es solo para los faltantes.',
      { campo },
    );
  }
}

/** Con la separación de funciones en «bloquear», el custodio no arquea su propio fondo. */
export class SeparacionDeFuncionesEnElArqueo extends ReglaDeNegocioInfringida {
  readonly codigo = 'separacion_de_funciones_en_el_arqueo';

  constructor() {
    super('El custodio del fondo no puede arquearlo: pida a otra persona que lo haga.');
  }
}

/** El arqueo ya se anuló. */
export class ArqueoYaAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'arqueo_ya_anulado';

  constructor(numero: number) {
    super(`El arqueo ${numero} ya está anulado.`);
  }
}

/** El faltante o el sobrante del arqueo ya está en una reposición vigente: se anula primero. */
export class ArqueoConComprobanteRepuesto extends ReglaDeNegocioInfringida {
  readonly codigo = 'arqueo_con_comprobante_repuesto';

  constructor(numero: number, reposicionNumero: number) {
    super(`El ajuste del arqueo ${numero} está en la reposición ${reposicionNumero}: anúlela primero.`);
  }
}
