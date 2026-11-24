import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  aCentesimasDeM2,
  deCentesimasDeM2ConDecimales,
  textoACentesimas,
  type FactoresDeSuperficie,
  type UnidadConCuerda,
} from '../../../dominio/superficie.js';
import { SuperficieInvalida } from '../../../dominio/errores-de-parcela.js';
import type { MedicionDto } from '../../dto/medicion.dto.js';
import type { ParcelaDto } from '../../dto/parcela.dto.js';
import { celdaDeInmuebles, type FilaDeParcelaEnExcel, type MedicionEnExcel } from '../../parcelas-en-excel.js';
import type { DependenciasDeParcelas } from './dependencias-de-parcelas.js';

/** Si la cifra se puede volver a importar y no pasa de la superficie total. */
function seReimporta(
  cifra: string,
  destino: UnidadConCuerda,
  tope: { totalM2: string; factores: FactoresDeSuperficie },
) {
  if (Number(cifra) === 0) return false;
  try {
    return aCentesimasDeM2(cifra, destino, tope.factores) <= textoACentesimas(tope.totalM2);
  } catch (error) {
    if (error instanceof SuperficieInvalida) return false;
    throw error;
  }
}

/**
 * La superficie útil en la unidad en que se escribió la total, con los cuatro decimales que admite la importación
 * (no los de pantalla). Si es igual a la total se repite la cifra original, y si el redondeo la dejara en cero o
 * por encima de la total se usa la cifra original: así el archivo siempre se puede volver a importar.
 */
function utilEnLaUnidadOriginal(medicion: MedicionDto, factores: FactoresDeSuperficie): string {
  if (medicion.superficieUtilM2 === medicion.superficieTotalM2) return medicion.cantidadOriginal;
  const destino = { unidad: medicion.unidadOriginal, varasPorLadoDeCuerda: medicion.varasPorLadoDeCuerda };
  const util = deCentesimasDeM2ConDecimales(
    textoACentesimas(medicion.superficieUtilM2),
    { ...destino, decimales: 4 },
    factores,
  );
  return seReimporta(util, destino, { totalM2: medicion.superficieTotalM2, factores })
    ? util
    : medicion.cantidadOriginal;
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
