import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import {
  ChequeNoImprimible,
  ChequeraSinFormatoDeImpresion,
  LoteDeChequesInvalido,
} from '../../../dominio/errores-de-impresion.js';
import type { FormatoDeCheque } from '../../../dominio/formatos-de-cheque/tipos.js';
import { armarCheque, type DatosParaImprimir } from '../../../dominio/impresion-de-cheque.js';
import type { ChequeParaImprimirDto } from '../../dto/impresion-de-cheque.dto.js';
import { formatoDeFabrica, resolverFormatoGuardado } from '../../formatos-de-cheque/resolucion-de-formato.js';
import type { ChequeParaImprimir } from '../../puertos/impresion-de-cheques.js';
import { armarComprobanteDeEgreso } from './comprobante-de-egreso.js';
import type { DependenciasDeImpresionDeCheques } from './dependencias-de-impresion-de-cheques.js';

/** El máximo de cheques de un lote: una sola chequera, en orden de número. */
export const MAXIMO_DE_CHEQUES_POR_LOTE = 50;

const AVISO_SIN_PROBAR =
  'Este formato no ha pasado la prueba de alineación: imprima la prueba en una hoja en blanco antes de gastar un cheque real.';

/** Cómo se va a imprimir cada cheque: ¿es copia?, ¿lleva el cheque o solo el comprobante? */
export interface OpcionesDeLaVista {
  esReimpresion: boolean;
  conCheque: boolean;
  /** Si el cheque ya figura como impreso al responder (siempre, tras imprimirlo). */
  impreso: boolean;
}

/** El cheque armado y el formato resuelto con que se armó (que es lo que se guarda en la impresión). */
export interface ChequeArmadoParaImprimir {
  dto: ChequeParaImprimirDto;
  formato: FormatoDeCheque;
  datos: ChequeParaImprimir;
}

interface FormatoDeLaChequera {
  formato: FormatoDeCheque;
  probado: boolean;
}

/** Los huecos en la numeración de un lote ordenado: el papel va en orden y se avisa antes de imprimir. */
function avisosDeHuecos(numeros: readonly number[]): string[] {
  const avisos: string[] = [];
  for (let i = 1; i < numeros.length; i += 1) {
    const [antes, despues] = [numeros[i - 1]!, numeros[i]!];
    if (despues - antes <= 1) continue;
    const faltan = despues - antes - 1 === 1 ? `el cheque ${antes + 1}` : `los cheques ${antes + 1} a ${despues - 1}`;
    avisos.push(`Entre el ${antes} y el ${despues} faltan ${faltan}: el papel va en orden.`);
  }
  return avisos;
}

/**
 * Arma lo que se imprime de uno o varios cheques: carga y revisa el lote, resuelve el formato de cada chequera, arma el
 * cheque con su relleno y el comprobante de egreso. No cambia nada: quien llama decide si lo marca como impreso.
 */
export class ArmadorDeLaImpresion {
  constructor(private readonly dependencias: DependenciasDeImpresionDeCheques) {}

  /**
   * Los cheques pedidos, por número, revisados como un lote.
   * @throws LoteDeChequesInvalido si son más de 50 o de más de una chequera.
   * @throws RecursoNoEncontrado si alguno no existe o no es de la empresa.
   */
  async cargar(ids: readonly string[]): Promise<ChequeParaImprimir[]> {
    const unicos = [...new Set(ids)];
    if (unicos.length === 0 || unicos.length > MAXIMO_DE_CHEQUES_POR_LOTE) {
      throw new LoteDeChequesInvalido(`Elija de 1 a ${MAXIMO_DE_CHEQUES_POR_LOTE} cheques.`);
    }
    const cheques = await this.dependencias.consultas.chequesParaImprimir(unicos);
    if (cheques.length !== unicos.length) throw new RecursoNoEncontrado('El cheque');
    if (new Set(cheques.map(({ chequeraId }) => chequeraId)).size > 1) {
      throw new LoteDeChequesInvalido('Los cheques de un lote deben ser de una misma chequera.');
    }
    return cheques;
  }

  /** Los avisos del lote (huecos en la numeración); sin huecos o con un solo cheque, ninguno. */
  avisosDelLote(cheques: readonly ChequeParaImprimir[]): string[] {
    return avisosDeHuecos(cheques.map(({ numero }) => numero));
  }

  /** @throws ChequeNoImprimible si está disponible, anulado o es de la carga inicial. */
  exigirImprimible(cheque: ChequeParaImprimir): void {
    if (cheque.estado === 'anulado') throw new ChequeNoImprimible(`El cheque ${cheque.numero} está anulado.`);
    if (cheque.estado === 'disponible' || !cheque.movimiento) {
      throw new ChequeNoImprimible(`El cheque ${cheque.numero} todavía no se emite: no hay qué imprimir.`);
    }
    if (cheque.chequeraDeApertura) {
      throw new ChequeNoImprimible(`El cheque ${cheque.numero} es de la carga inicial: no se imprime.`);
    }
  }

  /** @throws ChequeraSinFormatoDeImpresion si la chequera no tiene formato; FormatoDeChequeDañado si el suyo no sirve. */
  async formatoDe(cheque: ChequeParaImprimir): Promise<FormatoDeLaChequera> {
    if (cheque.plantillaDeCheque) return { formato: formatoDeFabrica(cheque.plantillaDeCheque), probado: false };
    if (!cheque.formatoDeChequeId) {
      throw new ChequeraSinFormatoDeImpresion(cheque.serie ? `de la serie ${cheque.serie}` : 'de este cheque');
    }
    const guardado = await this.dependencias.formatos.buscar(Identificador.desde(cheque.formatoDeChequeId));
    if (!guardado) throw new RecursoNoEncontrado('El formato de cheque');
    const propiedades = guardado.instantanea();
    return { formato: resolverFormatoGuardado(propiedades), probado: propiedades.probadoEn !== null };
  }

  /**
   * Arma cada cheque; el formato se resuelve una vez por chequera.
   * @throws BeneficiarioNoCabe, MontoEnLetrasNoCabe, MontoEnNumerosNoCabe o CampoDelFormatoFaltante si algo no cabe.
   */
  async armar(
    operador: Operador,
    cheques: readonly ChequeParaImprimir[],
    opciones: OpcionesDeLaVista,
  ): Promise<ChequeArmadoParaImprimir[]> {
    const { lugarDeEmision, empresa } = this.dependencias;
    const lugar = await lugarDeEmision.de(operador);
    const datosDeLaEmpresa = await empresa.obtener(operador);
    const formatos = new Map<string, FormatoDeLaChequera>();
    const armados: ChequeArmadoParaImprimir[] = [];
    for (const cheque of cheques) {
      this.exigirImprimible(cheque);
      if (!formatos.has(cheque.chequeraId)) formatos.set(cheque.chequeraId, await this.formatoDe(cheque));
      const { formato, probado } = formatos.get(cheque.chequeraId)!;
      const dto = await this.armarUno(
        operador,
        { cheque, formato, probado, lugar, empresa: datosDeLaEmpresa },
        opciones,
      );
      armados.push({ dto, formato, datos: cheque });
    }
    return armados;
  }

  private async armarUno(
    operador: Operador,
    { cheque, formato, probado, lugar, empresa }: ContextoDelCheque,
    opciones: OpcionesDeLaVista,
  ): Promise<ChequeParaImprimirDto> {
    const movimiento = cheque.movimiento!;
    const armado = armarCheque(formato, datosParaArmar(cheque, lugar));
    const detalle = movimiento.moduloDeOrigen
      ? await this.dependencias.origen.de(operador, {
          moduloDeOrigen: movimiento.moduloDeOrigen,
          movimientoId: movimiento.id,
        })
      : null;
    return {
      chequeId: cheque.chequeId,
      numero: cheque.numero,
      serie: cheque.serie,
      impreso: opciones.impreso,
      cheque: opciones.conCheque ? armado : null,
      comprobante: armarComprobanteDeEgreso({ cheque, empresa, detalle, esReimpresion: opciones.esReimpresion }),
      zonaDelComprobante: formato.comprobante,
      avisos: [...(opciones.conCheque ? armado.avisos : []), ...(probado ? [] : [AVISO_SIN_PROBAR])],
    };
  }
}

/** Lo que dice el movimiento del cheque, para dibujarlo en el papel. */
function datosParaArmar(cheque: ChequeParaImprimir, lugar: string): DatosParaImprimir {
  const movimiento = cheque.movimiento!;
  return {
    fecha: movimiento.fecha,
    lugar,
    beneficiario: movimiento.beneficiario,
    montoCentavos: movimiento.montoCentavos,
    concepto: movimiento.conceptoNombre,
    noNegociable: cheque.noNegociable,
    paraAbonoEnCuenta: movimiento.paraAbonoEnCuenta,
  };
}

interface ContextoDelCheque {
  cheque: ChequeParaImprimir;
  formato: FormatoDeCheque;
  probado: boolean;
  lugar: string;
  empresa: { nombre: string; nit: string | null };
}
