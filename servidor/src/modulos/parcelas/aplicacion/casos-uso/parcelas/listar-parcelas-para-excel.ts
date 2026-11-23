import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  aCentesimasDeM2,
  deCentesimasDeM2,
  textoACentesimas,
  type FactoresDeSuperficie,
} from '../../../dominio/superficie.js';
import type { MedicionDto } from '../../dto/medicion.dto.js';
import type { ParcelaDto } from '../../dto/parcela.dto.js';
import { celdaDeInmuebles, type FilaDeParcelaEnExcel, type MedicionEnExcel } from '../../parcelas-en-excel.js';
import type { DependenciasDeParcelas } from './dependencias-de-parcelas.js';

/**
 * La superficie útil en la unidad en que se escribió la total. Si es igual a la total se repite la cifra original, y
 * si el redondeo la hiciera pasar de la total se deja igual a ella: así el archivo siempre se puede volver a importar.
 */
function utilEnLaUnidadOriginal(medicion: MedicionDto, factores: FactoresDeSuperficie): string {
  if (medicion.superficieUtilM2 === medicion.superficieTotalM2) return medicion.cantidadOriginal;
  const destino = { unidad: medicion.unidadOriginal, varasPorLadoDeCuerda: medicion.varasPorLadoDeCuerda };
  const util = deCentesimasDeM2(textoACentesimas(medicion.superficieUtilM2), destino, factores);
  const pasaDeLaTotal = aCentesimasDeM2(util, destino, factores) > textoACentesimas(medicion.superficieTotalM2);
  return pasaDeLaTotal ? medicion.cantidadOriginal : util;
}

/** La medición vigente como la lleva el Excel: la cifra original, su unidad, las varas de la cuerda y la útil. */
function medicionEnExcel(medicion: MedicionDto | undefined, factores: FactoresDeSuperficie): MedicionEnExcel {
  if (!medicion) {
    return {
      cantidadOriginal: null,
      unidadOriginal: null,
      varasPorLadoDeCuerda: null,
      cantidadUtil: null,
      fuente: null,
      vigenteDesde: null,
    };
  }
  return {
    cantidadOriginal: medicion.cantidadOriginal,
    unidadOriginal: medicion.unidadOriginal,
    varasPorLadoDeCuerda: medicion.varasPorLadoDeCuerda,
    cantidadUtil: utilEnLaUnidadOriginal(medicion, factores),
    fuente: medicion.fuente,
    vigenteDesde: medicion.vigenteDesde,
  };
}

function filaDeExcel(
  parcela: ParcelaDto,
  extras: { medicion: MedicionDto | undefined; factores: FactoresDeSuperficie; inmuebles: string[] | undefined },
): FilaDeParcelaEnExcel {
  const { medicion, factores, inmuebles } = extras;
  return { ...parcela, ...medicionEnExcel(medicion, factores), inmuebles: celdaDeInmuebles(inmuebles) };
}

/** Las parcelas con su medición vigente y sus inmuebles, para exportar a Excel. */
export class ListarParcelasParaExcel {
  constructor(private readonly dependencias: DependenciasDeParcelas) {}

  ejecutar(operador: Operador): Promise<FilaDeParcelaEnExcel[]> {
    const { unidadDeTrabajo, consultas, consultasDeMediciones, ligas, configuracion } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const factores = await configuracion.factores(operador);
      const mediciones = await consultasDeMediciones.vigentesPorParcela();
      const inmuebles = await ligas.nombresPorParcela();
      const parcelas = await consultas.listar({});
      return parcelas.map((parcela) =>
        filaDeExcel(parcela, { medicion: mediciones.get(parcela.id), factores, inmuebles: inmuebles.get(parcela.id) }),
      );
    });
  }
}
