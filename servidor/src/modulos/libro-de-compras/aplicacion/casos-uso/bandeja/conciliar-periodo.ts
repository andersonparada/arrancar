import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { CoberturaDeLotes } from '../../../dominio/conciliacion/cobertura-de-la-sat.js';
import { conciliar } from '../../../dominio/conciliacion/conciliador.js';
import type { ResultadoDeConciliacion } from '../../../dominio/conciliacion/tipos-de-conciliacion.js';
import type { ConciliacionDto, ResumenDeConciliacion } from '../../dto/conciliacion.dto.js';
import type { ConsultasDeConciliacion } from '../../puertos/consultas-de-conciliacion.js';
import type { DatosDeLaEmpresaParaDocumentos } from '../../puertos/puertos-de-documentos.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultasDeConciliacion: ConsultasDeConciliacion;
  datosDeLaEmpresa: DatosDeLaEmpresaParaDocumentos;
}

function resumenDe(resultados: ResultadoDeConciliacion): ResumenDeConciliacion {
  const entradas = Object.entries(resultados).map(([clave, lista]) => [clave, lista.length]);
  return Object.fromEntries(entradas) as ResumenDeConciliacion;
}

/**
 * Cruza los documentos de un período con la bandeja de DTE recibidos y dice qué cuadra, qué difiere y qué falta de cada
 * lado. Es una consulta: se calcula al pedirla y no deja nada guardado.
 * @param periodo primer día del mes, `AAAA-MM-01`.
 */
export class ConciliarPeriodo {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, periodo: string): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, consultasDeConciliacion, datosDeLaEmpresa } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const documentos = await consultasDeConciliacion.documentos(periodo);
      const filas = await consultasDeConciliacion.filas(periodo);
      const cobertura = new CoberturaDeLotes(await consultasDeConciliacion.rangosDeLotes());
      const fechaDeInicio = await datosDeLaEmpresa.fechaDeInicio(operador);
      const resultados = conciliar({ periodo, documentos, filas, cobertura, fechaDeInicio });
      return {
        periodo,
        fechaDeInicio,
        hayDatosDeLaSat: cobertura.cubreElMesDe(periodo),
        resumen: resumenDe(resultados),
        resultados,
      };
    });
  }
}
