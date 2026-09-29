import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type {
  ChequeEnCirculacionCrudo,
  CondicionesDeCirculacion,
  ConsultasDeChequesEnCirculacion,
} from '../aplicacion/puertos/consultas-de-cheques-en-circulacion.js';
import type { PoliticaDeVencimientoDeCheques } from '../aplicacion/puertos/politica-de-vencimiento-de-cheques.js';

/** Los cheques que la prueba dicte; aplica la fecha de corte y la cuenta como lo haría la base. */
export class ConsultasDeChequesEnCirculacionFijas implements ConsultasDeChequesEnCirculacion {
  readonly consultadas: CondicionesDeCirculacion[] = [];

  constructor(private readonly cheques: ChequeEnCirculacionCrudo[]) {}

  async listar(condiciones: CondicionesDeCirculacion): Promise<ChequeEnCirculacionCrudo[]> {
    this.consultadas.push(condiciones);
    return this.cheques
      .filter((c) => c.fecha < condiciones.fechaDeCorte)
      .filter((c) => !condiciones.cuentaBancariaId || c.cuentaBancariaId === condiciones.cuentaBancariaId);
  }
}

/** La variable `bancos.cheques.meses_de_vencimiento` fija para la prueba. */
export class PoliticaDeVencimientoFija implements PoliticaDeVencimientoDeCheques {
  constructor(private readonly meses: number = 7) {}

  async mesesDeVencimiento(_operador: Operador): Promise<number> {
    return this.meses;
  }
}
