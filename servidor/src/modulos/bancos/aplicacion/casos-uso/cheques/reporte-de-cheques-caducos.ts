import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { aCentavos, deCentavos } from '../../../dominio/centavos.js';
import { diasDeAntiguedad, fechaDeCorteDeCheques } from '../../../dominio/cheques-en-circulacion.js';
import type {
  ChequeEnCirculacionDto,
  FiltroDeChequesCaducos,
  ReporteDeChequesCaducosDto,
} from '../../dto/cheque-en-circulacion.dto.js';
import type {
  ChequeEnCirculacionCrudo,
  ConsultasDeChequesEnCirculacion,
} from '../../puertos/consultas-de-cheques-en-circulacion.js';
import type { PoliticaDeVencimientoDeCheques } from '../../puertos/politica-de-vencimiento-de-cheques.js';

export interface DependenciasDelReporteDeChequesCaducos {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeChequesEnCirculacion;
  politicaDeVencimiento: PoliticaDeVencimientoDeCheques;
  /** La fecha de hoy (`Y-m-d`); las pruebas la fijan. */
  hoy?: () => string;
}

const hoyPorOmision = (): string => new Date().toISOString().slice(0, 10);

const conAntiguedad =
  (hoy: string) =>
  (cheque: ChequeEnCirculacionCrudo): ChequeEnCirculacionDto => ({
    ...cheque,
    diasDeAntiguedad: diasDeAntiguedad(cheque.fecha, hoy),
    origen: 'suelto',
  });

function armarReporte(
  { mesesDeAntiguedad, fechaDeCorte }: { mesesDeAntiguedad: number; fechaDeCorte: string },
  cheques: ChequeEnCirculacionDto[],
): ReporteDeChequesCaducosDto {
  const centavos = cheques.reduce((suma, { monto }) => suma + aCentavos(monto), 0);
  return { mesesDeAntiguedad, fechaDeCorte, totalDeCheques: cheques.length, montoTotal: deCentavos(centavos), cheques };
}

/**
 * Los cheques emitidos que el banco no ha cobrado y ya tienen más meses que el plazo (la variable de la
 * empresa, 7 por omisión, o el filtro). Nunca entran los cheques disponibles (no tienen movimiento), los
 * cobrados, los anulados ni los revertidos. Hoy todos son sueltos: aún no hay pagos de Cuentas por pagar.
 */
export class ReporteDeChequesCaducos {
  constructor(private readonly dependencias: DependenciasDelReporteDeChequesCaducos) {}

  ejecutar(operador: Operador, filtro: FiltroDeChequesCaducos = {}): Promise<ReporteDeChequesCaducosDto> {
    const { unidadDeTrabajo, consultas, politicaDeVencimiento, hoy = hoyPorOmision } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const mesesDeAntiguedad = filtro.meses ?? (await politicaDeVencimiento.mesesDeVencimiento(operador));
      const fechaDeHoy = hoy();
      const fechaDeCorte = fechaDeCorteDeCheques(fechaDeHoy, mesesDeAntiguedad);
      const { cuentaBancariaId, beneficiario } = filtro;
      const crudos = await consultas.listar({ fechaDeCorte, cuentaBancariaId, beneficiario });
      return armarReporte({ mesesDeAntiguedad, fechaDeCorte }, crudos.map(conAntiguedad(fechaDeHoy)));
    });
  }
}
