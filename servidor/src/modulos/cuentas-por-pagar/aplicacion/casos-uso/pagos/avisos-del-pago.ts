import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  avisosDeBancarizacion,
  SIN_EFECTO_FISCAL,
  unirEfectos,
  type PagoEnEfectivoDelMes,
} from '../../../dominio/bancarizacion-de-pagos.js';
import {
  avisoDeDiferenciaConRetencion,
  avisoDelPosfechado,
  avisoDeRetencionNoDescontada,
  avisosDeLaLinea,
} from '../../../dominio/avisos-de-pagos.js';
import { numeroDelPago } from '../../../dominio/pagos.js';
import type { DiferenciaPedida } from '../../../dominio/registro-de-pago.js';
import type { PagoDelMes } from '../../puertos/puertos-de-pagos.js';
import type { DependenciasDeRegistrarPago, LineaRevisada } from './dependencias-de-pagos.js';

type Dependencias = Pick<
  DependenciasDeRegistrarPago,
  'retenciones' | 'consultasDePagos' | 'fechasDeEntrada' | 'fiscal' | 'umbral'
>;

/** Una línea del pago con la retención que descuenta. */
export interface LineaConRetencion extends LineaRevisada {
  retencionDescontadaCentavos: number;
}

/** Lo que el armador necesita saber del pago para avisar. */
export interface PagoParaAvisar {
  forma: 'cheque' | 'nota_de_debito' | 'nota_ligada';
  /** Solo al ligar una nota: lo que le queda por aplicar después de este pago. */
  restanteDeLaNotaCentavos?: number;
  proveedorId: string;
  proveedorNombre: string;
  /** `AAAA-MM-DD`. */
  fecha: string;
  hoy: string;
  fechaDeInicio: string | null;
  lineas: readonly LineaConRetencion[];
  diferencias: readonly DiferenciaPedida[];
}

/** Arma los avisos que no bloquean de un pago: los de sus líneas, el posfechado, la diferencia y la bancarización (§5.5 y §5.7). */
export class ArmadorDeAvisosDelPago {
  constructor(private readonly dependencias: Dependencias) {}

  async avisos(operador: Operador, pago: PagoParaAvisar): Promise<string[]> {
    const posfechado = pago.fecha > pago.hoy ? [avisoDelPosfechado(pago.forma, pago.fecha)] : [];
    return [
      ...(await this.deLasLineas(pago)),
      ...posfechado,
      ...this.deLasDiferencias(pago),
      ...this.deLaNotaLigada(pago),
      ...(await this.deLaBancarizacion(operador, pago)),
    ];
  }

  private async deLasLineas(pago: PagoParaAvisar): Promise<string[]> {
    const ids = pago.lineas.map(({ fila }) => fila.documento.id);
    const { retenciones, consultasDePagos, fechasDeEntrada } = this.dependencias;
    const delLibro = await retenciones.deCargos(ids);
    const contrasenas = await consultasDePagos.contrasenas(pago.lineas.map(({ contrasena }) => contrasena.id));
    const recepciones = await fechasDeEntrada.deDocumentos(ids);
    return pago.lineas.flatMap((linea) => {
      const { documento } = linea.fila;
      return avisosDeLaLinea({
        documento,
        fechaDelPago: pago.fecha,
        retencionDescontadaCentavos: linea.retencionDescontadaCentavos,
        retenciones: delLibro.get(documento.id) ?? [],
        fechaDeRecepcion: recepciones.get(documento.id) ?? null,
        contrasena: contrasenas.get(linea.contrasena.id) ?? null,
      });
    });
  }

  private deLasDiferencias({ lineas, diferencias }: PagoParaAvisar): string[] {
    return diferencias.flatMap(({ cargoId }) => {
      const linea = lineas.find(({ fila }) => fila.documento.id === cargoId);
      return linea ? avisoDeDiferenciaConRetencion(linea.fila.documento) : [];
    });
  }

  /** Una nota ligada con una línea que descuenta retención: el banco debitó la nota sin esa retención (§5.2). */
  private deLaNotaLigada({ forma, lineas, restanteDeLaNotaCentavos }: PagoParaAvisar): string[] {
    if (forma !== 'nota_ligada') return [];
    return lineas
      .filter(({ retencionDescontadaCentavos }) => retencionDescontadaCentavos > 0)
      .map(({ fila, retencionDescontadaCentavos }) =>
        avisoDeRetencionNoDescontada(fila.documento, {
          retencionCentavos: retencionDescontadaCentavos,
          restanteDeLaNotaCentavos: restanteDeLaNotaCentavos ?? 0,
        }),
      );
  }

  private async deLaBancarizacion(operador: Operador, pago: PagoParaAvisar): Promise<string[]> {
    const { consultasDePagos, umbral } = this.dependencias;
    const delMes = await consultasDePagos.pagosDelMes(pago.proveedorId, pago.fecha);
    const efectivo = delMes.filter(({ forma }) => forma === 'efectivo');
    const efectos = await this.efectos(pago, efectivo);
    return avisosDeBancarizacion({
      proveedorNombre: pago.proveedorNombre,
      fecha: pago.fecha,
      umbralCentavos: await umbral.centavos(operador),
      montoDelPagoCentavos: pago.lineas.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0),
      totalesDeLosCargosCentavos: pago.lineas.map(({ fila }) => fila.documento.totalCentavos),
      pagadoEnElMesCentavos: delMes.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0),
      efectivoDelMes: efectos.delEfectivo,
      efectoDelPago: efectos.delPago,
    });
  }

  /** Lo que pierde este pago (`null` sin datos fiscales) y lo que pierde cada pago en efectivo del mes. */
  private async efectos(pago: PagoParaAvisar, efectivo: readonly PagoDelMes[]) {
    const propios = pago.lineas.map(({ fila }) => fila.documento.id);
    const todos = [...propios, ...efectivo.flatMap(({ cargoIds }) => cargoIds)];
    const porCargo = await this.dependencias.fiscal.efectoDe(todos, pago.fechaDeInicio);
    const deUnPago = (ids: readonly string[]) => unirEfectos(ids.map((id) => porCargo.get(id) ?? SIN_EFECTO_FISCAL));
    const delEfectivo: PagoEnEfectivoDelMes[] = efectivo.map((pagoEnEfectivo) => ({
      numero: numeroDelPago(pagoEnEfectivo.numero, pagoEnEfectivo.anioDeNumero),
      efecto: deUnPago(pagoEnEfectivo.cargoIds),
    }));
    return { delPago: propios.some((id) => !porCargo.has(id)) ? null : deUnPago(propios), delEfectivo };
  }
}
