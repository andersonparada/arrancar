import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { mesDelEnteroValido } from '../../../dominio/retenciones/entero-de-retenciones.js';
import {
  GRUPOS_DE_ENTERO,
  GRUPO_DE_ENTERO,
  claveDelGrupo,
  type GrupoDeEntero,
} from '../../../dominio/retenciones/grupo-de-entero.js';
import { resumirPorGrupo, type RetencionDelReporte } from '../../../dominio/retenciones/retencion-del-reporte.js';
import { dtoDeRetencion, type ReporteDeRetencionesDto } from '../../dto/retenciones.dto.js';
import type { ConsultasDeEnteros, ConsultasDeRetenciones } from '../../puertos/puertos-de-retenciones.js';
import { armarGrupo, cargarContextoDePlazos, type DependenciasDePlazos } from './grupos-del-reporte.js';

export interface FiltroDeRetenciones {
  /** `AAAA-MM` o `AAAA-MM-01`. */
  mes: string;
  grupo?: GrupoDeEntero;
  /** Por omisión, todas. */
  constancia?: 'con' | 'sin' | 'todas';
  /** Por omisión, todos: los vigentes y, aparte, los anulados. */
  documentos?: 'vigentes' | 'anulados' | 'todos';
}

interface Dependencias extends DependenciasDePlazos {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeRetenciones;
  enteros: ConsultasDeEnteros;
}

const pasaElFiltro = (retencion: RetencionDelReporte, filtro: FiltroDeRetenciones): boolean => {
  if (filtro.grupo && GRUPO_DE_ENTERO[retencion.regla] !== filtro.grupo) return false;
  if (filtro.constancia === 'con') return retencion.constancia !== null;
  if (filtro.constancia === 'sin') return retencion.constancia === null;
  return true;
};

/**
 * Las retenciones del mes (el de `retencion.fecha`) por impuesto y regla, con sus totales por grupo de entero, el plazo
 * de cada grupo con el calendario de feriados y el estado de su pago. Las de documentos anulados van aparte y no
 * suman; las que quedaron en cero salen marcadas y tampoco suman.
 */
export class ConsultarRetencionesDelMes {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws MesDelEnteroInvalido si el mes no es `AAAA-MM`. */
  ejecutar(operador: Operador, filtro: FiltroDeRetenciones): Promise<ReporteDeRetencionesDto> {
    const mes = mesDelEnteroValido(filtro.mes);
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const { consultas, enteros } = this.dependencias;
      const retenciones = await consultas.delMes(mes);
      const pagos = await enteros.delRango(mes, mes);
      const contexto = await cargarContextoDePlazos(this.dependencias, operador, [Number(mes.slice(0, 4))]);
      const resumenes = resumirPorGrupo(retenciones);
      const grupos = GRUPOS_DE_ENTERO.map((grupo) =>
        armarGrupo(contexto, { mes, grupo, resumen: resumenes.get(claveDelGrupo(mes, grupo)), pagos }),
      );
      return { mes, filtros: this.filtros(filtro), grupos, ...this.listas(retenciones, filtro) };
    });
  }

  private filtros(filtro: FiltroDeRetenciones): ReporteDeRetencionesDto['filtros'] {
    return {
      grupo: filtro.grupo ?? null,
      constancia: filtro.constancia ?? 'todas',
      documentos: filtro.documentos ?? 'todos',
    };
  }

  private listas(retenciones: readonly RetencionDelReporte[], filtro: FiltroDeRetenciones) {
    const elegidas = retenciones.filter((retencion) => pasaElFiltro(retencion, filtro));
    const de = (estado: 'vigente' | 'anulado') => elegidas.filter((r) => r.documento.estado === estado);
    return {
      retenciones: filtro.documentos === 'anulados' ? [] : de('vigente').map(dtoDeRetencion),
      anuladas: filtro.documentos === 'vigentes' ? [] : de('anulado').map(dtoDeRetencion),
    };
  }
}
