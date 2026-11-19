import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  calcularCierre,
  totalesDelCierre,
  type CuotaDelMes,
  type TotalesDelCierre,
} from '../../../dominio/depreciacion/cierre-del-mes.js';
import {
  hallazgoDeMesAnteriorSinCerrar,
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
   */
  async armar(operador: Operador, periodo: string): Promise<CierreArmado> {
    const ultimo = await this.dependencias.cierres.ultimoMesCerrado();
    if (ultimo && periodo <= ultimo) throw new MesCerrado(periodo);
    const siguiente = await this.siguienteMes(operador);
    if (!siguiente) throw new SinMesPorCerrar();
    if (periodo < siguiente) throw new MesAnteriorAlInicio(siguiente);
    if (periodo > siguiente) return this.sinCalcular(periodo, siguiente);
    return this.calcular(operador, periodo);
  }

  /** Un mes que no es el siguiente no se calcula: sus cuotas dependen de las del mes que falta. */
  private sinCalcular(periodo: string, siguiente: string): CierreArmado {
    const hallazgos = [hallazgoDeMesAnteriorSinCerrar(siguiente)];
    const totales = totalesDelCierre([]);
    const huella = huellaDelCierre({ periodo, hallazgos, totales, regimenIsr: null, cuotas: 0 });
    return { periodo, siguiente, hallazgos, cuotas: [], totales, regimenIsr: null, huella };
  }

  private async calcular(operador: Operador, periodo: string): Promise<CierreArmado> {
    const { consultas, bandeja, primerMes, mesesDeConstruccion, cargaInicial } = this.dependencias;
    const conBajasDelMes = (await primerMes.paraEmpresa(operador)) === 'mes_siguiente';
    const calculado = calcularCierre(periodo, await consultas.activosParaCerrar(periodo, conBajasDelMes));
    const meses = await mesesDeConstruccion.paraEmpresa(operador);
    const hallazgos = hallazgosDelCierre(
      {
        ...(await consultas.hallazgosDeActivos(periodo, meses)),
        lineasEnLaBandeja: (await bandeja.listar({ hasta: periodo })).length,
        cargaInicialAbierta: !(await cargaInicial.obtener(operador)).cerrada,
        mesesDeConstruccion: meses,
      },
      calculado,
    );
    const totales = totalesDelCierre(calculado.cuotas);
    const regimenIsr = await consultas.regimenIsr(periodo);
    const huella = huellaDelCierre({ periodo, hallazgos, totales, regimenIsr, cuotas: calculado.cuotas.length });
    return { periodo, siguiente: periodo, hallazgos, cuotas: calculado.cuotas, totales, regimenIsr, huella };
  }
}
