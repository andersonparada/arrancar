import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type {
  CorrelativoDto,
  FiltroDeCorrelativos,
  HuecoDto,
  ReporteDeCorrelativosDto,
} from '../../dto/correlativo.dto.js';
import { NOMBRES_DE_CORRELATIVOS } from '../../numeracion-de-comprobantes.js';
import type { ConsultasDeCorrelativos, RangoDeCorrelativo } from '../../puertos/consultas-de-correlativos.js';

interface DependenciasDelReporteDeCorrelativos {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeCorrelativos;
}

/**
 * Por cada correlativo de Bancos (notas de crédito, de débito y transferencias), lista los números que
 * faltan y los explica con la auditoría: quién, cuándo y por qué se eliminó el comprobante. Un hueco sin
 * rastro en la auditoría se marca como alerta.
 */
export class ReporteDeCorrelativos {
  constructor(private readonly dependencias: DependenciasDelReporteDeCorrelativos) {}

  ejecutar(operador: Operador, { clave }: FiltroDeCorrelativos = {}): Promise<ReporteDeCorrelativosDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const rangos = await consultas.rangos(clave);
      const correlativos: CorrelativoDto[] = [];
      for (const rango of rangos) correlativos.push(await this.aCorrelativo(rango));
      return { correlativos };
    });
  }

  private async aCorrelativo(rango: RangoDeCorrelativo): Promise<CorrelativoDto> {
    const { clave, anio, ultimo, emitidos } = rango;
    return {
      clave,
      nombre: NOMBRES_DE_CORRELATIVOS[clave] ?? clave,
      anio,
      ultimo,
      emitidos,
      huecos: await this.explicarHuecos(rango),
    };
  }

  private async explicarHuecos({ clave, anio, huecos }: RangoDeCorrelativo): Promise<HuecoDto[]> {
    if (huecos.length === 0) return [];
    const explicaciones = await this.dependencias.consultas.explicaciones({ clave, anio, huecos });
    return huecos.map((numero) => {
      const delNumero = explicaciones.filter((e) => e.numero === numero).map(({ numero: _numero, ...resto }) => resto);
      return { numero, estado: delNumero.length > 0 ? 'explicado' : 'alerta', explicaciones: delNumero };
    });
  }
}
