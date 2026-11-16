import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { fechaLegible } from './avisos.js';

/** El corte es anterior al día antes de la fecha de inicio: antes de eso los datos no están completos. */
export class CorteAnteriorAlInicio extends DatoInvalido {
  readonly codigo = 'corte_anterior_al_inicio';

  constructor(corteMinimo: string) {
    super(
      `La fecha de corte no puede ser anterior al ${fechaLegible(corteMinimo)}, el día antes de la fecha de inicio.`,
      {
        campo: 'corte',
      },
    );
  }
}

/** El rango de un reporte empieza después de donde termina. */
export class RangoDeReporteInvalido extends DatoInvalido {
  readonly codigo = 'rango_de_reporte_invalido';

  constructor() {
    super('La fecha inicial no puede ser posterior a la final.', { campo: 'desde' });
  }
}

/** El rango de un reporte pasa del máximo que se puede pedir de una vez. */
export class RangoDeReporteMuyLargo extends DatoInvalido {
  readonly codigo = 'rango_de_reporte_muy_largo';

  constructor(maximoDeMeses: number) {
    super(`El rango no puede pasar de ${maximoDeMeses} meses: acórtelo.`, { campo: 'desde' });
  }
}

/** La pantalla del estado de cuenta no muestra más de este número de líneas; Excel no tiene tope. */
export class EstadoDeCuentaConDemasiadasLineas extends DatoInvalido {
  readonly codigo = 'estado_de_cuenta_con_demasiadas_lineas';

  constructor(lineas: number, maximo: number) {
    super(
      `El estado de cuenta tiene ${lineas} líneas y la pantalla muestra hasta ${maximo}: acorte el rango o use Excel.`,
      {
        campo: 'desde',
      },
    );
  }
}
