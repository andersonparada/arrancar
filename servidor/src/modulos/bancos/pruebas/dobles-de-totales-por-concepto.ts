import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type {
  FiltroDeTotalesPorConcepto,
  SaldosDelRango,
  TotalesDeUnConcepto,
} from '../aplicacion/dto/reportes-por-concepto.dto.js';
import type { ConsultasDeTotalesPorConcepto } from '../aplicacion/puertos/consultas-de-totales-por-concepto.js';

/** Los totales y saldos que la prueba dicte; guarda los filtros con que se le preguntó. */
export class ConsultasDeTotalesFijas implements ConsultasDeTotalesPorConcepto {
  readonly filtros: FiltroDeTotalesPorConcepto[] = [];

  constructor(
    private readonly totales: TotalesDeUnConcepto[],
    private readonly saldos: SaldosDelRango = { saldoAlInicio: '0.00', saldoAlFinal: '0.00' },
    private readonly cuentasQueExisten: string[] = [],
  ) {}

  async exigirCuenta(cuentaBancariaId: string): Promise<void> {
    if (!this.cuentasQueExisten.includes(cuentaBancariaId)) throw new RecursoNoEncontrado('La cuenta bancaria');
  }

  async totalesPorConcepto(filtro: FiltroDeTotalesPorConcepto): Promise<TotalesDeUnConcepto[]> {
    this.filtros.push(filtro);
    return this.totales;
  }

  async saldosDelRango(): Promise<SaldosDelRango> {
    return this.saldos;
  }
}

/** Totales de un concepto con lo mínimo: los montos y lo demás por omisión (un concepto de operación). */
export function totalesDe(cambios: Partial<TotalesDeUnConcepto>): TotalesDeUnConcepto {
  return {
    conceptoId: 'c-1',
    conceptoNombre: 'Depósito de ventas',
    claveDeSistema: null,
    actividadDeFlujo: 'operacion',
    grupoDeFlujo: null,
    entradas: '0.00',
    salidas: '0.00',
    cantidad: 1,
    cantidadDeInversos: 0,
    ...cambios,
  };
}
