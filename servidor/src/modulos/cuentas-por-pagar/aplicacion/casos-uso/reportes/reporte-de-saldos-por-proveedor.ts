import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { agruparPorNit, repartirEnBloques, type SaldoDeNit } from '../../../dominio/saldos-por-nit.js';
import { filaDeSaldoDto, totalesDeSaldosDto } from '../../dto/dto-de-saldos-al-corte.js';
import type { ConciliacionDeSaldosDto, ReporteDeSaldosPorProveedorDto } from '../../dto/saldos-al-corte.dto.js';
import type { ConsultasDeNotasSinAplicar } from '../../puertos/puertos-de-notas-sin-aplicar.js';
import { avisosDeNitRepetido, avisosDelCorte, LEYENDAS_DE_SALDOS } from './avisos-de-saldos.js';
import { baseDelCorte, type DependenciasDeReportesDeSaldos, type SolicitudDeCorte } from './base-del-corte.js';

/** Lo que necesita R1: lo de todos los reportes de saldos y la lectura de R11 para la conciliación al pie. */
export interface DependenciasDeSaldosPorProveedor extends DependenciasDeReportesDeSaldos {
  notasSinAplicar: ConsultasDeNotasSinAplicar;
}

/** Los filtros de R1. */
export interface FiltroDeSaldosPorProveedor extends SolicitudDeCorte {
  /** Incluir los NIT cuyo neto al corte es cero. */
  incluirSinSaldo: boolean;
  orden: 'nombre' | 'mayor_saldo';
}

const porMayorSaldo = (a: SaldoDeNit, b: SaldoDeNit) => Math.abs(b.neto) - Math.abs(a.neto);

/** Por nombre (como los entrega la agrupación) o con el mayor saldo primero. */
const ordenados = (grupos: SaldoDeNit[], orden: FiltroDeSaldosPorProveedor['orden']): SaldoDeNit[] =>
  orden === 'mayor_saldo' ? [...grupos].sort(porMayorSaldo) : grupos;

/** La conciliación solo tiene sentido con todos los proveedores y toda autorización: la transitoria es de la empresa. */
const conciliable = ({ proveedorId, autorizacion }: FiltroDeSaldosPorProveedor): boolean =>
  proveedorId === undefined && autorizacion === 'todos';

function conciliacionDe(saldoNeto: string, pagosPorAplicarCentavos: number): ConciliacionDeSaldosDto {
  return {
    saldoNetoDelAuxiliar: saldoNeto,
    pagosPorAplicar: deCentavos(pagosPorAplicarCentavos),
    proveedoresNetoDePagosPorAplicar: deCentavos(aCentavos(saldoNeto) - pagosPorAplicarCentavos),
  };
}

/**
 * R1: el saldo de cada NIT al corte, en dos bloques (se le debe pagar y nos debe), con cargos por tramo de antigüedad,
 * saldos a favor, comprometido y sin autorizar. Nunca se netea un NIT con otro (`docs/modulos/diseno-cp5-reportes.md`).
 */
export class ReporteDeSaldosPorProveedor {
  constructor(private readonly dependencias: DependenciasDeSaldosPorProveedor) {}

  ejecutar(operador: Operador, filtro: FiltroDeSaldosPorProveedor): Promise<ReporteDeSaldosPorProveedorDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const base = await baseDelCorte(this.dependencias, operador, filtro);
      const grupos = agruparPorNit(await consultas.saldosPorProveedor(base));
      const { acreedores, deudores } = repartirEnBloques(grupos, filtro.incluirSinSaldo);
      const avisos = avisosDelCorte(await consultas.avisosDelCorte(base), base);
      const totales = totalesDeSaldosDto(acreedores, deudores);
      return {
        corte: base.corte,
        fechaDeInicio: base.fechaDeInicio,
        acreedores: ordenados(acreedores, filtro.orden).map((grupo) => filaDeSaldoDto(grupo, false)),
        deudores: ordenados(deudores, filtro.orden).map((grupo) => filaDeSaldoDto(grupo, true)),
        totales,
        conciliacion: conciliable(filtro) ? conciliacionDe(totales.saldoNeto, await this.porAplicar(base)) : undefined,
        avisos: [...avisos, ...avisosDeNitRepetido(grupos)],
        leyendas: LEYENDAS_DE_SALDOS,
      };
    });
  }

  /** El saldo de la transitoria al corte: lo que sumó R11. */
  private async porAplicar({ empresaId, corte }: { empresaId: string; corte: string }): Promise<number> {
    const notas = await this.dependencias.notasSinAplicar.notasSinAplicar({ empresaId, corte });
    return notas.reduce((total, nota) => total + nota.montoCentavos - nota.aplicadoCentavos, 0);
  }
}
