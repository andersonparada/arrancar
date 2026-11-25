import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ReposicionCompensadaEmitida } from '../../../dominio/eventos-de-fondos.js';
import type { Fondo } from '../../../dominio/fondos.js';
import type { ReposicionNueva } from '../../puertos/puertos-de-reposiciones.js';
import { exigirFechaDeLaReposicion } from '../../../dominio/reglas-de-reposiciones.js';
import {
  desgloseDe,
  firmadosDe,
  lineasEmitidas,
  marcarProcesadosEnElLibro,
  totalDe,
  type ComprobanteFirmado,
} from './armado-de-la-reposicion.js';
import type { DependenciasDeReposiciones } from './dependencias-de-reposiciones.js';
import { CLAVE_DE_REPOSICIONES } from './registrar-reposicion.js';

/** Lo que el cierre le pasa a la reposición compensada: el fondo (bloqueado), su custodio y las fechas. */
export interface DatosDeLaReposicionDelCierre {
  fondo: Fondo;
  custodio: string;
  fecha: string;
  hoy: string;
}

/** Lo que la reposición del cierre usa: guardarla, leer y bloquear los pendientes, el libro y el correlativo. */
export type DependenciasDeLaCompensada = Pick<
  DependenciasDeReposiciones,
  'reposiciones' | 'consultas' | 'comprobantes' | 'libro' | 'correlativos'
>;

/**
 * Liquida lo pendiente de un fondo que se cierra (§5.8): una reposición `compensada_al_cerrar`, sin cheque ni nota (el
 * dinero ya salió de la caja), con todos los comprobantes vigentes sin reponer. Numera con el mismo correlativo que las
 * reposiciones y marca como procesados los documentos del libro. Corre dentro de la transacción del cierre. Si no hay
 * pendiente, o suma cero o menos (las notas de crédito y los sobrantes compensan lo gastado), no crea nada: esos comprobantes
 * quedan en el fondo cerrado, que ya no admite bajas del libro y no los cuenta como pendientes.
 */
export class ReponedorAlCerrar {
  constructor(private readonly dependencias: DependenciasDeLaCompensada) {}

  /** @throws FechaDeLaReposicionInvalida si el cierre es anterior a un comprobante pendiente. */
  async reponer(operador: Operador, datos: DatosDeLaReposicionDelCierre): Promise<ReposicionCompensadaEmitida | null> {
    const { consultas, comprobantes } = this.dependencias;
    const pendientes = await consultas.pendientesDelFondo(datos.fondo.id);
    if (pendientes.length === 0) return null;
    const firmados = firmadosDe(await comprobantes.bloquear(pendientes.map(({ id }) => id)));
    exigirFechaDeLaReposicion(datos.fecha, {
      hoy: datos.hoy,
      fondo: datos.fondo,
      comprobantes: firmados.map(({ comprobante }) => comprobante),
    });
    if (totalDe(firmados) <= 0) return null;
    return this.guardar(operador, { datos, firmados });
  }

  private async guardar(
    operador: Operador,
    por: { datos: DatosDeLaReposicionDelCierre; firmados: readonly ComprobanteFirmado[] },
  ): Promise<ReposicionCompensadaEmitida> {
    const { datos, firmados } = por;
    const { numero, anio } = await this.dependencias.correlativos.siguiente(CLAVE_DE_REPOSICIONES, datos.fecha);
    const reposicion = this.nueva({ datos, firmados, numero, anio });
    await this.dependencias.reposiciones.agregar(reposicion);
    await marcarProcesadosEnElLibro(this.dependencias.libro, operador, firmados);
    return {
      reposicionId: reposicion.id,
      numero,
      montoCentavos: reposicion.montoCentavos,
      desglose: desgloseDe(firmados),
      lineas: lineasEmitidas(firmados),
    };
  }

  private nueva(por: {
    datos: DatosDeLaReposicionDelCierre;
    firmados: readonly ComprobanteFirmado[];
    numero: number;
    anio: number;
  }): ReposicionNueva {
    const { datos, firmados, numero, anio } = por;
    return {
      id: crypto.randomUUID(),
      fondoId: datos.fondo.id,
      numero,
      anioDeNumero: anio,
      fecha: datos.fecha,
      forma: 'compensada_al_cerrar',
      montoCentavos: totalDe(firmados),
      movimientoId: null,
      custodio: datos.custodio,
      laHizoElCustodio: false,
      lineas: firmados.map(({ comprobante, firmadoCentavos }) => ({
        comprobanteId: comprobante.id,
        montoCentavos: firmadoCentavos,
      })),
    };
  }
}
