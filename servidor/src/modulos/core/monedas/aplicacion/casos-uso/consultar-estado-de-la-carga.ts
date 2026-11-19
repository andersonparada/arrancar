import { diasDePublicacionDeCruces, fechasDelRango, sumarDiasAFecha } from '../../dominio/fechas-de-publicacion.js';
import type {
  BitacoraDelBanguat,
  ConsultaGuardada,
  MonedaConCodigoDelBanguat,
} from '../puertos/bitacora-del-banguat.js';
import type { CerrojoDeCarga } from '../puertos/cargas-de-tipos.js';
import type { HoyDeLaInstalacion } from '../tipos-de-cambio.js';

interface Dependencias {
  bitacora: BitacoraDelBanguat;
  reloj: HoyDeLaInstalacion;
  cerrojo: Pick<CerrojoDeCarga, 'estaTomado'>;
}

/** El estado de la serie de una moneda con código del Banguat. */
export interface EstadoDeLaSerie {
  moneda: string;
  nombre: string;
  codigoBanguat: number;
  activa: boolean;
  ultimaFecha: string | null;
  /** Días de atraso: del calendario para el dólar y de lunes a viernes para las demás; nulo si nunca se cargó. */
  diasDeAtraso: number | null;
  /** Es una moneda activa y su atraso pasa del límite (dólar: 1 día; demás: 3 días hábiles). */
  atrasada: boolean;
}

export interface EstadoDeLaCarga {
  hoy: string;
  /** Una carga o la actualización de la lista corre ahora mismo (en esta u otra instancia). */
  enCurso: boolean;
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
    const { bitacora, reloj, cerrojo } = this.dependencias;
    const hoy = await reloj.hoy();
    const [monedas, consultas, enCurso] = await Promise.all([
      bitacora.monedasConCodigo(),
      bitacora.ultimasConsultas(opciones),
      cerrojo.estaTomado(),
    ]);
    const series: EstadoDeLaSerie[] = [];
    for (const moneda of monedas) series.push(await this.estadoDe(moneda, hoy));
    return { hoy, enCurso, series, consultas };
  }

  private async estadoDe(moneda: MonedaConCodigoDelBanguat, hoy: string): Promise<EstadoDeLaSerie> {
    const { ultimaFecha } = moneda;
    const esElDolar = moneda.codigoBanguat === CODIGO_DEL_DOLAR;
    const diasDeAtraso = ultimaFecha ? this.atraso(ultimaFecha, hoy, esElDolar) : null;
    const limite = esElDolar ? DIAS_DE_ATRASO_DEL_DOLAR : DIAS_HABILES_DE_ATRASO_DE_LAS_DEMAS;
    return { ...moneda, diasDeAtraso, atrasada: moneda.activa && (diasDeAtraso === null || diasDeAtraso > limite) };
  }

  /** El dólar cuenta días del calendario; las demás, solo de lunes a viernes después de la última fecha cargada. */
  private atraso(ultimaFecha: string, hoy: string, esElDolar: boolean): number {
    if (ultimaFecha >= hoy) return 0;
    const desde = sumarDiasAFecha(ultimaFecha, 1);
    return esElDolar ? fechasDelRango(desde, hoy).length : diasDePublicacionDeCruces(desde, hoy).size;
  }
}
