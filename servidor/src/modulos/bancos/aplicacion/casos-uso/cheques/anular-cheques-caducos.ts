import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { ErrorEsperado } from '../../../../core/compartido/dominio/errores.js';
import { aCentavos, deCentavos } from '../../../dominio/centavos.js';
import { fechaDeCorteDeCheques } from '../../../dominio/cheques-en-circulacion.js';
import {
  AnulacionEnLoteConProblemas,
  ChequeNoEsCaduco,
  FechaDeAnulacionFutura,
  type ProblemaDeAnulacionEnLote,
} from '../../../dominio/errores-de-anulacion-en-lote.js';
import type {
  ChequeEnCirculacionCrudo,
  ConsultasDeChequesEnCirculacion,
} from '../../puertos/consultas-de-cheques-en-circulacion.js';
import type { PoliticaDeVencimientoDeCheques } from '../../puertos/politica-de-vencimiento-de-cheques.js';
import type { AnularCheque } from './anular-cheque.js';

export interface DependenciasDeAnularChequesCaducos {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeChequesEnCirculacion;
  politicaDeVencimiento: PoliticaDeVencimientoDeCheques;
  reloj: Reloj;
  anularCheque: AnularCheque;
}

export interface AnulacionEnLote {
  chequeIds: string[];
  motivo: string;
  /** La fecha común de todas las notas inversas; por omisión, hoy en la zona horaria de la empresa. */
  fecha?: string;
}

export interface ResultadoDeAnulacionEnLote {
  totalDeCheques: number;
  montoTotal: string;
  fecha: string;
}

const comoProblema = (chequeId: string, error: ErrorEsperado): ProblemaDeAnulacionEnLote => ({
  chequeId,
  codigo: error.codigo,
  mensaje: error.message,
});

/**
 * Anula varios cheques caducos en una sola transacción, todo o nada: cada uno con su nota de crédito
 * inversa a la misma fecha (aunque su mes siga abierto), la causa `caducidad` y el mismo motivo. Solo
 * entran los cheques que el reporte de caducos todavía muestra; si alguno falla no se anula ninguno y
 * la respuesta dice cuáles tienen problema. Cada anulación deja su rastro en la auditoría.
 */
export class AnularChequesCaducos {
  constructor(private readonly dependencias: DependenciasDeAnularChequesCaducos) {}

  /** @throws AnulacionEnLoteConProblemas si algún cheque no se puede anular (la transacción se deshace). */
  ejecutar(operador: Operador, solicitud: AnulacionEnLote): Promise<ResultadoDeAnulacionEnLote> {
    const { unidadDeTrabajo, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const hoy = await reloj.hoy(operador);
      const fecha = solicitud.fecha ?? hoy;
      if (fecha > hoy) throw new FechaDeAnulacionFutura();
      const caducos = await this.caducosDe(operador, solicitud.chequeIds, hoy);
      const problemas = await this.anularUnoPorUno(operador, { ...solicitud, fecha }, caducos);
      if (problemas.length > 0) throw new AnulacionEnLoteConProblemas(problemas);
      const centavos = [...caducos.values()].reduce((suma, { monto }) => suma + aCentavos(monto), 0);
      return { totalDeCheques: caducos.size, montoTotal: deCentavos(centavos), fecha };
    });
  }

  private async caducosDe(
    operador: Operador,
    chequeIds: string[],
    hoy: string,
  ): Promise<Map<string, ChequeEnCirculacionCrudo>> {
    const { consultas, politicaDeVencimiento } = this.dependencias;
    const meses = await politicaDeVencimiento.mesesDeVencimiento(operador);
    const fechaDeCorte = fechaDeCorteDeCheques(hoy, meses);
    const vigentes = await consultas.listar({ fechaDeCorte, chequeIds });
    return new Map(vigentes.map((cheque) => [cheque.chequeId, cheque]));
  }

  private async anularUnoPorUno(
    operador: Operador,
    { chequeIds, motivo, fecha }: Required<AnulacionEnLote>,
    caducos: Map<string, ChequeEnCirculacionCrudo>,
  ): Promise<ProblemaDeAnulacionEnLote[]> {
    const problemas: ProblemaDeAnulacionEnLote[] = [];
    for (const chequeId of new Set(chequeIds)) {
      try {
        if (!caducos.has(chequeId)) throw new ChequeNoEsCaduco();
        await this.dependencias.anularCheque.ejecutar(operador, {
          chequeId,
          motivo,
          fecha,
          causa: 'caducidad',
          conInversoSiempre: true,
        });
      } catch (error) {
        if (!(error instanceof ErrorEsperado)) throw error;
        problemas.push(comoProblema(chequeId, error));
      }
    }
    return problemas;
  }
}
