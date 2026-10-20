import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { LibroDeExcel } from '../../../../core/intercambio/aplicacion/puertos/libro-de-excel.js';
import { rangoDePeriodos } from '../../../dominio/analisis/rango-de-periodos.js';
import type { RangoDto } from '../../dto/analisis.dto.js';
import type { ConsultasDeAnalisis } from '../../puertos/consultas-de-analisis.js';
import type { DefinicionDeAnalisis, SolicitudDeAnalisis } from './definicion-de-analisis.js';

export interface DependenciasDeAnalisis {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeAnalisis;
}

async function armar<Armado, Dto>(
  dependencias: DependenciasDeAnalisis,
  definicion: DefinicionDeAnalisis<Armado, Dto>,
  pedido: { operador: Operador; solicitud: SolicitudDeAnalisis },
): Promise<Armado> {
  const { operador, solicitud } = pedido;
  const rango = rangoDePeriodos(solicitud.desde, solicitud.hasta);
  return dependencias.unidadDeTrabajo.ejecutar(operador, () =>
    definicion.armar({
      consultas: dependencias.consultas,
      empresaId: operador.empresaId,
      rango,
      incluirFueraDelLibro: solicitud.incluirFueraDelLibro,
    }),
  );
}

/** Un análisis de compras sobre un rango de períodos. */
export class ConsultarAnalisis<Armado, Dto> {
  constructor(
    private readonly dependencias: DependenciasDeAnalisis,
    private readonly definicion: DefinicionDeAnalisis<Armado, Dto>,
  ) {}

  async ejecutar(operador: Operador, solicitud: SolicitudDeAnalisis): Promise<RangoDto & Dto> {
    const armado = await armar(this.dependencias, this.definicion, { operador, solicitud });
    const { desde, hasta } = rangoDePeriodos(solicitud.desde, solicitud.hasta);
    return { desde, hasta, ...this.definicion.dto(armado) };
  }
}

/** El mismo análisis en un Excel de una hoja. */
export class ExportarAnalisis<Armado, Dto> {
  constructor(
    private readonly dependencias: DependenciasDeAnalisis & { excel: Pick<LibroDeExcel, 'escribirVarias'> },
    private readonly definicion: DefinicionDeAnalisis<Armado, Dto>,
  ) {}

  async ejecutar(operador: Operador, solicitud: SolicitudDeAnalisis): Promise<{ nombre: string; contenido: Buffer }> {
    const armado = await armar(this.dependencias, this.definicion, { operador, solicitud });
    const { desde, hasta } = rangoDePeriodos(solicitud.desde, solicitud.hasta);
    return {
      nombre: `${this.definicion.clave}-${desde.slice(0, 7)}-a-${hasta.slice(0, 7)}.xlsx`,
      contenido: await this.dependencias.excel.escribirVarias([this.definicion.hoja(armado)]),
    };
  }
}
