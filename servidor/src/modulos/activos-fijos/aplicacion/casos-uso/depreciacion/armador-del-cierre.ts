import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  calcularCierre,
  type CierreCalculado,
  totalesDelCierre,
  type CuotaDelMes,
  type TotalesDelCierre,
} from '../../../dominio/depreciacion/cierre-del-mes.js';
import {
  hallazgoDeMesAnteriorSinCerrar,
  hallazgoDeMesPorLlegar,
  hallazgosDelCierre,
  type Hallazgo,
} from '../../../dominio/depreciacion/hallazgos-del-cierre.js';
import { periodoDe, sumarMeses } from '../../../dominio/depreciacion/meses.js';
import { MesAnteriorAlInicio, SinMesPorCerrar } from '../../../dominio/errores-de-cierre.js';
import { MesCerrado } from '../../../dominio/errores-de-depreciacion.js';
import type { DependenciasDeCierre } from './dependencias-de-cierre.js';
import { huellaDelCierre } from './huella-del-cierre.js';

/** Un mes de depreciación calculado pero todavía no guardado: lo que se revisa y, si se confirma, se guarda. */
export interface CierreArmado {
  periodo: string;
  /** El mes que toca cerrar (el siguiente al último cerrado). */
  siguiente: string;
  /** Es posterior al mes en curso: no se calcula ni se puede cerrar. */
  porLlegar: boolean;
  hallazgos: Hallazgo[];
  cuotas: CuotaDelMes[];
  totales: TotalesDelCierre;
  regimenIsr: string | null;
  huella: string;
}

/**
 * Arma la revisión de un mes (§6.9): comprueba el orden de los cierres, calcula las cuotas con el dominio y reúne los
 * hallazgos. La usan «revisar» y «cerrar», para que el cierre guarde exactamente lo que se revisó.
 */
export class ArmadorDelCierre {
  constructor(private readonly dependencias: DependenciasDeCierre) {}

  /**
   * El mes que toca cerrar: el siguiente al último cerrado; el primero es el de la fecha de inicio de la empresa o, sin
   * ella, el del primer activo puesto en uso. `null` si todavía no hay de dónde empezar.
   */
  async siguienteMes(operador: Operador): Promise<string | null> {
    const { cierres, cargaInicial, consultas } = this.dependencias;
    const ultimo = await cierres.ultimoMesCerrado();
    if (ultimo) return sumarMeses(ultimo, 1);
    const { fechaDeInicio } = await cargaInicial.obtener(operador);
    return fechaDeInicio ? periodoDe(fechaDeInicio) : consultas.primerMesConTramos();
  }

  /**
   * @throws MesCerrado si el mes ya está cerrado.
   * @throws MesAnteriorAlInicio si es anterior al primer mes por cerrar.
   * @throws SinMesPorCerrar si no hay de dónde empezar a cerrar.
   * Un mes posterior al mes en curso vuelve con el bloqueo `mes_por_llegar`.
   */
  async armar(operador: Operador, periodo: string): Promise<CierreArmado> {
    const ultimo = await this.dependencias.cierres.ultimoMesCerrado();
    if (ultimo && periodo <= ultimo) throw new MesCerrado(periodo);
    const siguiente = await this.siguienteMes(operador);
    if (!siguiente) throw new SinMesPorCerrar();
    if (periodo < siguiente) throw new MesAnteriorAlInicio(siguiente);
    const mesEnCurso = periodoDe(await this.dependencias.reloj.hoy(operador));
    if (periodo > mesEnCurso) return this.sinCalcular(periodo, siguiente, hallazgoDeMesPorLlegar(periodo));
    if (periodo > siguiente) return this.sinCalcular(periodo, siguiente, hallazgoDeMesAnteriorSinCerrar(siguiente));
    return this.calcular(operador, periodo);
  }

  /** Un mes que no se puede cerrar todavía no se calcula: sus cuotas dependen de un mes que falta o que no llega. */
  private sinCalcular(periodo: string, siguiente: string, bloqueo: Hallazgo): CierreArmado {
    const hallazgos = [bloqueo];
    const totales = totalesDelCierre([]);
    const huella = huellaDelCierre({ periodo, hallazgos, totales, regimenIsr: null, cuotas: 0 });
    const porLlegar = bloqueo.codigo === 'mes_por_llegar';
    return { periodo, siguiente, porLlegar, hallazgos, cuotas: [], totales, regimenIsr: null, huella };
  }

  private async calcular(operador: Operador, periodo: string): Promise<CierreArmado> {
    const { consultas, primerMes } = this.dependencias;
    const conBajasDelMes = (await primerMes.paraEmpresa(operador)) === 'mes_siguiente';
    const calculado = calcularCierre(periodo, await consultas.activosParaCerrar(periodo, conBajasDelMes));
    const hallazgos = await this.hallazgosDe(operador, periodo, calculado);
    const totales = totalesDelCierre(calculado.cuotas);
    const regimenIsr = await consultas.regimenIsr(periodo);
    const huella = huellaDelCierre({ periodo, hallazgos, totales, regimenIsr, cuotas: calculado.cuotas.length });
    const cuotas = calculado.cuotas;
    return { periodo, siguiente: periodo, porLlegar: false, hallazgos, cuotas, totales, regimenIsr, huella };
  }

  private async hallazgosDe(operador: Operador, periodo: string, calculado: CierreCalculado): Promise<Hallazgo[]> {
    const { consultas, bandeja, mesesDeConstruccion, cargaInicial } = this.dependencias;
    const meses = await mesesDeConstruccion.paraEmpresa(operador);
    return hallazgosDelCierre(
      {
        ...(await consultas.hallazgosDeActivos(periodo, meses)),
        lineasEnLaBandeja: (await bandeja.listar({ hasta: periodo })).length,
        cargaInicialAbierta: !(await cargaInicial.obtener(operador)).cerrada,
        mesesDeConstruccion: meses,
      },
      calculado,
    );
  }
}
