import { fechasDelRango, sumarDiasAFecha } from '../../dominio/fechas-de-publicacion.js';
import type {
  BitacoraDelBanguat,
  ConsultaGuardada,
  MonedaConCodigoDelBanguat,
} from '../puertos/bitacora-del-banguat.js';
import type { DiasHabilesParaTipos, HoyDeLaInstalacion } from '../tipos-de-cambio.js';

interface Dependencias {
  bitacora: BitacoraDelBanguat;
  calendario: DiasHabilesParaTipos;
  reloj: HoyDeLaInstalacion;
}

/** El estado de la serie de una moneda con código del Banguat. */
export interface EstadoDeLaSerie {
  moneda: string;
  nombre: string;
  codigoBanguat: number;
  activa: boolean;
  ultimaFecha: string | null;
  /** Días de atraso: del calendario para el dólar y hábiles para las demás; nulo si nunca se cargó. */
  diasDeAtraso: number | null;
  /** Es una moneda activa y su atraso pasa del límite (dólar: 1 día; demás: 3 días hábiles). */
  atrasada: boolean;
}

export interface EstadoDeLaCarga {
  hoy: string;
  series: EstadoDeLaSerie[];
  consultas: ConsultaGuardada[];
}

export const MAXIMO_DE_CONSULTAS = 200;
const CODIGO_DEL_DOLAR = 2;
const DIAS_DE_ATRASO_DEL_DOLAR = 1;
const DIAS_HABILES_DE_ATRASO_DE_LAS_DEMAS = 3;

/** Lo que muestra el panel de tipos de cambio de soporte: la bitácora reciente y qué series van atrasadas. */
export class ConsultarEstadoDeLaCarga {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(opciones: { limite: number; moneda?: string | undefined }): Promise<EstadoDeLaCarga> {
    const { bitacora, reloj } = this.dependencias;
    const hoy = await reloj.hoy();
    const [monedas, consultas] = await Promise.all([bitacora.monedasConCodigo(), bitacora.ultimasConsultas(opciones)]);
    const series: EstadoDeLaSerie[] = [];
    for (const moneda of monedas) series.push(await this.estadoDe(moneda, hoy));
    return { hoy, series, consultas };
  }

  private async estadoDe(moneda: MonedaConCodigoDelBanguat, hoy: string): Promise<EstadoDeLaSerie> {
    const { ultimaFecha } = moneda;
    const esElDolar = moneda.codigoBanguat === CODIGO_DEL_DOLAR;
    const diasDeAtraso = ultimaFecha ? await this.atraso(ultimaFecha, hoy, esElDolar) : null;
    const limite = esElDolar ? DIAS_DE_ATRASO_DEL_DOLAR : DIAS_HABILES_DE_ATRASO_DE_LAS_DEMAS;
    return { ...moneda, diasDeAtraso, atrasada: moneda.activa && (diasDeAtraso === null || diasDeAtraso > limite) };
  }

  /** El dólar cuenta días del calendario; las demás, solo los hábiles después de la última fecha cargada. */
  private async atraso(ultimaFecha: string, hoy: string, calendario: boolean): Promise<number> {
    if (ultimaFecha >= hoy) return 0;
    const dias = fechasDelRango(sumarDiasAFecha(ultimaFecha, 1), hoy);
    if (calendario) return dias.length;
    let habiles = 0;
    for (const dia of dias) if (await this.dependencias.calendario.esHabil(dia)) habiles++;
    return habiles;
  }
}
