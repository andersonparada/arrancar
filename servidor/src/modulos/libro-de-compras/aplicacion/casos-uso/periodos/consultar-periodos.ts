import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { diferenciaDeFotos } from '../../../dominio/periodos/foto-del-periodo.js';
import {
  dtoDeDeclaracion,
  dtoDelControl,
  dtoDePeriodo,
  type CambioDesdeLaDeclaracionDto,
  type DetalleDePeriodoDto,
  type PeriodosDelAnioDto,
} from '../../dto/periodo.dto.js';
import type { DeclaracionGuardada } from '../../puertos/puertos-de-periodos.js';
import { armarLibro, periodoDelLibro } from '../libro/consultar-libro.js';
import { fotoDelLibro, type DependenciasDePeriodos } from './dependencias-de-periodos.js';
import { revisionDelPeriodo } from './revision-del-periodo.js';

const MESES = Array.from({ length: 12 }, (_, indice) => indice + 1);

/** Los doce meses de un año (el actual si no se pide otro) con su estado: los que nunca se declararon están abiertos. */
export class ListarPeriodos {
  constructor(private readonly dependencias: DependenciasDePeriodos) {}

  ejecutar(operador: Operador, pedido: number | undefined): Promise<PeriodosDelAnioDto> {
    const { unidadDeTrabajo, periodos, ajuste, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const hoy = await reloj.hoy(operador);
      const anio = pedido ?? Number(hoy.slice(0, 4));
      const filas = new Map((await periodos.filasDelAnio(anio)).map((fila) => [fila.periodo, fila]));
      const ultimas = new Map((await periodos.ultimasDelAnio(anio)).map((ultima) => [ultima.periodo, ultima]));
      return {
        anio,
        control: dtoDelControl(await ajuste.detalle()),
        periodos: MESES.map((mes) => {
          const periodo = `${anio}-${String(mes).padStart(2, '0')}-01`;
          return dtoDePeriodo(periodo, { fila: filas.get(periodo) ?? null, ultima: ultimas.get(periodo) ?? null, hoy });
        }),
      };
    });
  }
}

/** Un período con su historial, lo que cambió el libro desde la última declaración y lo que conviene revisar antes de declarar. */
export class ObtenerPeriodo {
  constructor(private readonly dependencias: DependenciasDePeriodos) {}

  ejecutar(operador: Operador, periodo: string): Promise<DetalleDePeriodoDto> {
    const primerDia = periodoDelLibro(periodo);
    const { unidadDeTrabajo, periodos, ajuste, reloj, consultasDelPeriodo } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const historial = await periodos.historial(primerDia);
      const ultima = historial.filter((declaracion) => declaracion.evento !== 'reapertura').at(-1) ?? null;
      return {
        periodo: dtoDePeriodo(primerDia, {
          fila: await periodos.buscar(primerDia),
          ultima,
          hoy: await reloj.hoy(operador),
        }),
        control: dtoDelControl(await ajuste.detalle()),
        historial: historial.map((declaracion) => dtoDeDeclaracion(declaracion, true)),
        cambioDesdeLaDeclaracion: ultima ? await this.cambios(operador, ultima) : null,
        revision: await revisionDelPeriodo(consultasDelPeriodo, primerDia),
      };
    });
  }

  /** El libro de hoy contra la foto de la última declaración: «cambió después de declarar». */
  private async cambios(operador: Operador, ultima: DeclaracionGuardada): Promise<CambioDesdeLaDeclaracionDto> {
    const actual = fotoDelLibro(await armarLibro(this.dependencias, operador, ultima.periodo));
    return {
      contraLaSecuencia: ultima.secuencia,
      ...diferenciaDeFotos(ultima.foto!, actual),
      documentos: await this.dependencias.consultasDelPeriodo.documentosCambiadosDesde(ultima.periodo, ultima.creadoEn),
    };
  }
}
