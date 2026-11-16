import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import {
  armarLineasDelEstado,
  totalesDelEstado,
  type PresentacionDelEstado,
} from '../../../dominio/estado-de-cuenta.js';
import {
  EstadoDeCuentaConDemasiadasLineas,
  RangoDeReporteInvalido,
  RangoDeReporteMuyLargo,
} from '../../../dominio/errores-de-reportes.js';
import { mesesEntre, primerDiaDelMes, sumarDias } from '../../../dominio/fechas-de-corte.js';
import { ProveedorDelReporteNoExiste } from '../../errores.js';
import { lineaDelEstadoDto, totalesDelEstadoDto } from '../../dto/dto-de-reportes-de-proveedor.js';
import type { EstadoDeCuentaDto } from '../../dto/reportes-de-proveedor.dto.js';
import type { ConsultasDeReportesDeProveedor } from '../../puertos/puertos-de-reportes-de-proveedor.js';
import type { BaseDelCorte } from '../../puertos/puertos-de-saldos-al-corte.js';
import { avisosDelCorte, LEYENDAS_DE_SALDOS } from './avisos-de-saldos.js';
import { baseDelCorte, type DependenciasDeReportesDeSaldos } from './base-del-corte.js';

/** Lo que necesitan los reportes de un proveedor, de sus saldos a favor y de sus contraseñas. */
export interface DependenciasDeReportesDeProveedor extends DependenciasDeReportesDeSaldos {
  consultasDeProveedor: ConsultasDeReportesDeProveedor;
}

/** La pantalla muestra hasta este número de líneas; Excel no tiene tope. */
export const MAXIMO_DE_LINEAS_EN_PANTALLA = 2000;
const MAXIMO_DE_MESES = 24;

export interface SolicitudDelEstadoDeCuenta {
  proveedorId: string;
  /** Por omisión, el primer día del mes de `hasta`. */
  desde?: string;
  /** Por omisión, hoy. */
  hasta?: string;
  mostrarAnulados: boolean;
  presentacion: PresentacionDelEstado;
}

/** Cómo se entrega: la pantalla tiene tope de líneas; Excel no. */
export interface OpcionesDelEstadoDeCuenta {
  sinTope: boolean;
}

/** El rango pedido con sus omisiones, validado: `desde <= hasta` y no más de 24 meses. */
function rangoDe(solicitud: SolicitudDelEstadoDeCuenta, hoy: string): { desde: string; hasta: string } {
  const hasta = solicitud.hasta ?? hoy;
  const desde = solicitud.desde ?? primerDiaDelMes(hasta);
  if (desde > hasta) throw new RangoDeReporteInvalido();
  if (mesesEntre(desde, hasta) > MAXIMO_DE_MESES) throw new RangoDeReporteMuyLargo(MAXIMO_DE_MESES);
  return { desde, hasta };
}

/** La pantalla no muestra más de 2,000 líneas; Excel sí. */
function exigirQueQuepan(lineas: number, sinTope: boolean): void {
  if (!sinTope && lineas > MAXIMO_DE_LINEAS_EN_PANTALLA) {
    throw new EstadoDeCuentaConDemasiadasLineas(lineas, MAXIMO_DE_LINEAS_EN_PANTALLA);
  }
}

/**
 * R3: el estado de cuenta de un proveedor en un rango, con su saldo anterior y su saldo corrido. La presentación
 * `para_el_proveedor` pone el cargo por el total y cada retención como abono, para cotejarlo con el de él; el saldo final es
 * el mismo (el neto del proveedor en R1 a la fecha final).
 */
export class ReporteDeEstadoDeCuenta {
  constructor(private readonly dependencias: DependenciasDeReportesDeProveedor) {}

  ejecutar(
    operador: Operador,
    solicitud: SolicitudDelEstadoDeCuenta,
    { sinTope }: OpcionesDelEstadoDeCuenta,
  ): Promise<EstadoDeCuentaDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const { desde, hasta } = rangoDe(solicitud, await this.dependencias.reloj.hoy(operador));
      const proveedor = await this.proveedor(solicitud.proveedorId);
      const alCierre = await this.base(operador, solicitud.proveedorId, hasta);
      const saldoAnterior = await this.netoAl(operador, solicitud.proveedorId, sumarDias(desde, -1));
      const lineas = await this.lineas(alCierre, { desde, hasta, saldoAnterior }, solicitud);
      exigirQueQuepan(lineas.length, sinTope);
      return {
        proveedor,
        presentacion: solicitud.presentacion,
        desde,
        hasta,
        lineas: lineas.map(lineaDelEstadoDto),
        totales: totalesDelEstadoDto(totalesDelEstado(lineas, saldoAnterior)),
        ...(await this.alCorteYAvisos(alCierre, solicitud.presentacion)),
      };
    });
  }

  private async proveedor(id: string) {
    const datos = await this.dependencias.consultasDeProveedor.datosDelProveedor(id);
    if (!datos) throw new ProveedorDelReporteNoExiste();
    return { id, ...datos };
  }

  private base(operador: Operador, proveedorId: string, corte: string): Promise<BaseDelCorte> {
    return baseDelCorte(this.dependencias, operador, { corte, proveedorId, autorizacion: 'todos' });
  }

  /** El saldo neto del proveedor a un día, el mismo de R1 (cero si todavía no tiene documentos). */
  private async netoAl(operador: Operador, proveedorId: string, corte: string): Promise<number> {
    const base = await this.base(operador, proveedorId, corte);
    const [fila] = await this.dependencias.consultas.saldosPorProveedor(base);
    return fila?.neto ?? 0;
  }

  private async lineas(
    { empresaId, fechaDeInicio }: BaseDelCorte,
    { desde, hasta, saldoAnterior }: { desde: string; hasta: string; saldoAnterior: number },
    { proveedorId, presentacion, mostrarAnulados }: SolicitudDelEstadoDeCuenta,
  ) {
    const { consultasDeProveedor } = this.dependencias;
    const rango = { empresaId, proveedorId, desde, hasta, fechaDeInicio };
    const retenciones =
      presentacion === 'para_el_proveedor'
        ? await consultasDeProveedor.retencionesDelProveedor(empresaId, proveedorId)
        : [];
    const lineas = armarLineasDelEstado({
      movimientos: await consultasDeProveedor.movimientosDelProveedor(rango),
      retenciones,
      saldoAnteriorCentavos: saldoAnterior,
      presentacion,
    });
    return mostrarAnulados ? lineas : lineas.filter(({ anulada }) => !anulada);
  }

  /** Solo la presentación interna lleva lo comprometido, los avisos y las leyendas del corte. */
  private async alCorteYAvisos(base: BaseDelCorte, presentacion: PresentacionDelEstado) {
    if (presentacion === 'para_el_proveedor') return { avisos: [], leyendas: [] };
    const { consultas } = this.dependencias;
    const [fila] = await consultas.saldosPorProveedor(base);
    return {
      alCorte: {
        comprometido: deCentavos(fila?.comprometido ?? 0),
        disponible: deCentavos((fila?.neto ?? 0) - (fila?.comprometido ?? 0)),
      },
      avisos: avisosDelCorte(await consultas.avisosDelCorte(base), base),
      leyendas: LEYENDAS_DE_SALDOS,
    };
  }
}
