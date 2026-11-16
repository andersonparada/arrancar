import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { agruparPorNit, repartirEnBloques, type SaldoDeNit } from '../../../dominio/saldos-por-nit.js';
import { filaDeSaldoDto, totalesDeSaldosDto } from '../../dto/dto-de-saldos-al-corte.js';
import type { ReporteDeSaldosPorProveedorDto } from '../../dto/saldos-al-corte.dto.js';
import { avisosDeNitRepetido, avisosDelCorte, LEYENDAS_DE_SALDOS } from './avisos-de-saldos.js';
import { baseDelCorte, type DependenciasDeReportesDeSaldos, type SolicitudDeCorte } from './base-del-corte.js';

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

/**
 * R1: el saldo de cada NIT al corte, en dos bloques (se le debe pagar y nos debe), con cargos por tramo de antigüedad,
 * saldos a favor, comprometido y sin autorizar. Nunca se netea un NIT con otro (`docs/modulos/diseno-cp5-reportes.md`).
 */
export class ReporteDeSaldosPorProveedor {
  constructor(private readonly dependencias: DependenciasDeReportesDeSaldos) {}

  ejecutar(operador: Operador, filtro: FiltroDeSaldosPorProveedor): Promise<ReporteDeSaldosPorProveedorDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const base = await baseDelCorte(this.dependencias, operador, filtro);
      const grupos = agruparPorNit(await consultas.saldosPorProveedor(base));
      const { acreedores, deudores } = repartirEnBloques(grupos, filtro.incluirSinSaldo);
      const avisos = avisosDelCorte(await consultas.avisosDelCorte(base), base);
      return {
        corte: base.corte,
        fechaDeInicio: base.fechaDeInicio,
        acreedores: ordenados(acreedores, filtro.orden).map((grupo) => filaDeSaldoDto(grupo, false)),
        deudores: ordenados(deudores, filtro.orden).map((grupo) => filaDeSaldoDto(grupo, true)),
        totales: totalesDeSaldosDto(acreedores, deudores),
        avisos: [...avisos, ...avisosDeNitRepetido(grupos)],
        leyendas: LEYENDAS_DE_SALDOS,
      };
    });
  }
}
