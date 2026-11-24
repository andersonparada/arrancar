import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  totalesDelCierre,
  valuarExistencias,
  type RenglonDelCierre,
  type TotalesDelCierre,
} from '../../../dominio/cierre/existencias-del-cierre.js';
import {
  hallazgoDeMesAnteriorSinCerrar,
  hallazgoDeMesPorLlegar,
  hallazgosDelCierre,
  type Hallazgo,
} from '../../../dominio/cierre/hallazgos-del-cierre.js';
import { primerDiaDelMes, sumarMeses, ultimoDiaDelMes } from '../../../dominio/cierre/meses.js';
import type { MetodoDeCosteo } from '../../../dominio/costeo/tipos.js';
import { MesAnteriorAlInicio, SinMesPorCerrar } from '../../../dominio/errores-de-cierre.js';
import { MesCerrado } from '../../../dominio/errores-de-kardex.js';
import { metodoDelDia } from '../../kardex/metodo-de-la-empresa.js';
import type { DependenciasDeCierres } from './dependencias-de-cierres.js';
import { huellaDelCierre } from './huella-del-cierre.js';

/** Un mes del inventario calculado pero todavía no guardado: lo que se revisa y, si se confirma, se guarda. */
export interface CierreArmado {
  periodo: string;
  /** El mes que toca cerrar (el siguiente al último cerrado). */
  siguiente: string;
  /** Es posterior al mes en curso: no se calcula ni se puede cerrar. */
  porLlegar: boolean;
  hallazgos: Hallazgo[];
  renglones: RenglonDelCierre[];
  totales: TotalesDelCierre;
  metodo: MetodoDeCosteo | null;
  regimenIsr: string | null;
  huella: string;
}

/**
 * Arma la revisión de un mes (§6.11): comprueba el orden de los cierres, valúa las existencias al último día del mes con
 * el dominio y reúne los hallazgos. La usan «revisar» y «cerrar», para que el cierre guarde exactamente lo que se revisó.
 */
export class ArmadorDelCierre {
  constructor(private readonly dependencias: DependenciasDeCierres) {}

  /**
   * El mes que toca cerrar: el siguiente al último cerrado; el primero es el de la fecha de inicio de la empresa o,
   * sin ella, el del primer movimiento. `null` si todavía no hay de dónde empezar.
   */
  async siguienteMes(operador: Operador): Promise<string | null> {
    const { cierres, cargaInicial, consultas } = this.dependencias;
    const ultimo = await cierres.ultimoMesCerrado();
    if (ultimo) return sumarMeses(ultimo, 1);
    const { fechaDeInicio } = await cargaInicial.obtener(operador);
    return fechaDeInicio ? primerDiaDelMes(fechaDeInicio) : consultas.primerMesConMovimientos();
  }

  /**
   * @throws MesCerrado si el mes ya está cerrado.
   * @throws MesAnteriorAlInicio si es anterior al primer mes por cerrar.
   * @throws SinMesPorCerrar si no hay de dónde empezar a cerrar.
   * Un mes posterior al mes en curso, o que no es el siguiente, vuelve con su bloqueo y sin calcular.
   */
  async armar(operador: Operador, periodo: string): Promise<CierreArmado> {
    const ultimo = await this.dependencias.cierres.ultimoMesCerrado();
    if (ultimo && periodo <= ultimo) throw new MesCerrado(periodo);
    const siguiente = await this.siguienteMes(operador);
    if (!siguiente) throw new SinMesPorCerrar();
    if (periodo < siguiente) throw new MesAnteriorAlInicio(siguiente);
    const mesEnCurso = primerDiaDelMes(await this.dependencias.reloj.hoy(operador));
    if (periodo > mesEnCurso) return this.sinCalcular(periodo, siguiente, hallazgoDeMesPorLlegar(periodo));
    if (periodo > siguiente) return this.sinCalcular(periodo, siguiente, hallazgoDeMesAnteriorSinCerrar(siguiente));
    return this.calcular(operador, periodo);
  }

  /** Un mes que no se puede cerrar todavía no se valúa: depende de un mes que falta o que no llega. */
  private sinCalcular(periodo: string, siguiente: string, bloqueo: Hallazgo): CierreArmado {
    const hallazgos = [bloqueo];
    const totales = totalesDelCierre([]);
    const huella = huellaDelCierre({ periodo, hallazgos, totales, metodo: null, regimenIsr: null, renglones: [] });
    const porLlegar = bloqueo.codigo === 'mes_por_llegar';
    return { periodo, siguiente, porLlegar, hallazgos, renglones: [], totales, metodo: null, regimenIsr: null, huella };
  }

  private async calcular(operador: Operador, periodo: string): Promise<CierreArmado> {
    const { consultas } = this.dependencias;
    const renglones = valuarExistencias(await consultas.existenciasAl(ultimoDiaDelMes(periodo)));
    const totales = totalesDelCierre(renglones);
    const hallazgos = await this.hallazgosDe(operador, periodo);
    const metodo = await this.metodoDelMes(operador, periodo);
    const regimenIsr = await consultas.regimenIsr(periodo);
    const huella = huellaDelCierre({ periodo, hallazgos, totales, metodo, regimenIsr, renglones });
    return { periodo, siguiente: periodo, porLlegar: false, hallazgos, renglones, totales, metodo, regimenIsr, huella };
  }

  /** El método que rige el último día del mes; si nadie lo eligió todavía, el que se propone a la empresa. */
  private async metodoDelMes(operador: Operador, periodo: string): Promise<MetodoDeCosteo> {
    const { metodos, metodoInicial } = this.dependencias;
    const fila = metodoDelDia(await metodos.listar(), ultimoDiaDelMes(periodo));
    return fila?.metodo ?? metodoInicial.paraEmpresa(operador);
  }

  private async hallazgosDe(operador: Operador, periodo: string): Promise<Hallazgo[]> {
    const { consultas, bandeja, cargaInicial, preguntas } = this.dependencias;
    const propios = hallazgosDelCierre({
      ...(await consultas.hallazgosDeLaBase(periodo)),
      lineasEnLaBandeja: (await bandeja.listar({ hasta: periodo })).length,
      cargaInicialAbierta: !(await cargaInicial.obtener(operador)).cerrada,
    });
    return [...propios, ...(await preguntas.hallazgosDeOtrosModulos(operador, periodo))];
  }
}
