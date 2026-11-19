import { rangoDeRelleno, fechasSinPublicacion } from '../../dominio/huecos-de-publicacion.js';
import { fechasDelRango, sumarDiasAFecha } from '../../dominio/fechas-de-publicacion.js';
import type { MonedaPedida } from '../../dominio/publicacion.js';
import type { CargasDeTipos } from '../puertos/cargas-de-tipos.js';
import type { DiasHabilesParaTipos } from '../tipos-de-cambio.js';
import type { ConsultarAlBanguat, PedidoAlBanguat, ResumenDeConsulta } from './consultar-al-banguat.js';

const CODIGO_DEL_DOLAR = 2;
const DIAS_DE_LA_SEMANA_EN_LA_MANANA = 6;
const PAUSA_ENTRE_MONEDAS_EN_MS = 1_000;

interface Dependencias {
  consultar: ConsultarAlBanguat;
  cargas: CargasDeTipos;
  calendario: DiasHabilesParaTipos;
  /** Las llamadas van una tras otra; esta pausa va entre una moneda y la siguiente. */
  esperar?: (milisegundos: number) => Promise<void>;
  /** Un fallo que no es del Banguat (la base de datos, por ejemplo) no detiene a las demás monedas. */
  alFallar: (mensaje: string, error: unknown) => void;
}

/** Lo que pide una carga a mano. */
export interface RangoManual {
  hoy: string;
  desde: string;
  hasta: string;
  usuarioId: string;
}

const esperarDeVerdad = (milisegundos: number): Promise<void> =>
  new Promise((resolver) => setTimeout(resolver, milisegundos));

const esElDolar = (moneda: MonedaPedida): boolean => moneda.codigoBanguat === CODIGO_DEL_DOLAR;

/**
 * Qué se pide al Banguat en cada vuelta. Solo se cargan las monedas activas con código; las llamadas van en serie con
 * una pausa entre monedas, y el fallo de una no frena a las demás.
 */
export class VueltasDeCarga {
  constructor(private readonly dependencias: Dependencias) {}

  /** 06:00: el dólar del día (`TipoCambioDia`). Los reintentos de la hora los decide el horario. */
  async madrugada(hoy: string): Promise<ResumenDeConsulta[]> {
    const dolar = (await this.dependencias.cargas.monedasACargar()).find(esElDolar);
    if (!dolar) return [];
    return this.pedirA([dolar], { vuelta: 'madrugada', hoy, desde: hoy, hasta: hoy, operacion: 'TipoCambioDia' });
  }

  /** 09:30: cada otra moneda con la semana hasta hoy (trae hoy y rellena la semana). */
  async manana(hoy: string): Promise<ResumenDeConsulta[]> {
    const demas = (await this.dependencias.cargas.monedasACargar()).filter((m) => !esElDolar(m));
    const desde = sumarDiasAFecha(hoy, -DIAS_DE_LA_SEMANA_EN_LA_MANANA);
    return this.pedirA(demas, { vuelta: 'manana', hoy, desde, hasta: hoy });
  }

  /** De noche: el dólar de mañana (ya publicado) y, una vez, las demás monedas que aún no tienen el de hoy. */
  async noche(hoy: string): Promise<ResumenDeConsulta[]> {
    const monedas = await this.dependencias.cargas.monedasACargar();
    const dolar = monedas.filter(esElDolar);
    const resumenes = await this.pedirA(dolar, { vuelta: 'noche', hoy, desde: hoy, hasta: sumarDiasAFecha(hoy, 1) });
    const demas = (await this.dependencias.calendario.esHabil(hoy)) ? monedas.filter((m) => !esElDolar(m)) : [];
    const sinElDeHoy = await this.sinTipoEn(demas, hoy);
    const desde = sumarDiasAFecha(hoy, -DIAS_DE_LA_SEMANA_EN_LA_MANANA);
    return [...resumenes, ...(await this.pedirA(sinElDeHoy, { vuelta: 'noche', hoy, desde, hasta: hoy }))];
  }

  /** Al arrancar y una vez al día: por moneda y solo si tiene huecos en los últimos 45 días hasta ayer. */
  async rellenar(vuelta: 'arranque' | 'relleno', hoy: string): Promise<ResumenDeConsulta[]> {
    const resumenes: ResumenDeConsulta[] = [];
    for (const moneda of await this.dependencias.cargas.monedasACargar()) {
      const rango = await this.rangoConHuecos(moneda, hoy);
      if (!rango) continue;
      resumenes.push(...(await this.pedirA([moneda], { vuelta, hoy, ...rango })));
    }
    return resumenes;
  }

  /** «Cargar ahora» de soporte: el rango pedido, para todas las monedas activas con código. */
  async manual({ hoy, desde, hasta, usuarioId }: RangoManual): Promise<ResumenDeConsulta[]> {
    const monedas = await this.dependencias.cargas.monedasACargar();
    return this.pedirA(monedas, { vuelta: 'manual', hoy, desde, hasta, disparadaPor: usuarioId });
  }

  private async rangoConHuecos(moneda: MonedaPedida, hoy: string): Promise<{ desde: string; hasta: string } | null> {
    const rango = rangoDeRelleno(sumarDiasAFecha(hoy, -1));
    const tenidas = await this.dependencias.cargas.fechasConTipoDelBanguat(moneda.moneda, rango.desde, rango.hasta);
    const huecos = fechasSinPublicacion({
      rango,
      moneda: moneda.moneda,
      conocidas: tenidas.map((fecha) => ({ moneda: moneda.moneda, fecha })),
      diasEsperados: esElDolar(moneda) ? undefined : await this.diasHabiles(rango),
    });
    return huecos.length > 0 ? { desde: huecos[0]!, hasta: huecos.at(-1)! } : null;
  }

  private async diasHabiles(rango: { desde: string; hasta: string }): Promise<Set<string>> {
    const habiles = new Set<string>();
    for (const fecha of fechasDelRango(rango.desde, rango.hasta))
      if (await this.dependencias.calendario.esHabil(fecha)) habiles.add(fecha);
    return habiles;
  }

  private async sinTipoEn(monedas: readonly MonedaPedida[], fecha: string): Promise<MonedaPedida[]> {
    const faltan: MonedaPedida[] = [];
    for (const moneda of monedas) {
      const tenidas = await this.dependencias.cargas.fechasConTipoDelBanguat(moneda.moneda, fecha, fecha);
      if (tenidas.length === 0) faltan.push(moneda);
    }
    return faltan;
  }

  /** Pide a cada moneda su consulta, una tras otra; el USD usa `TipoCambioDia` o `TipoCambioRango`, las demás el rango. */
  private async pedirA(
    monedas: readonly MonedaPedida[],
    base: Omit<PedidoAlBanguat, 'moneda' | 'operacion'> & { operacion?: PedidoAlBanguat['operacion'] },
  ): Promise<ResumenDeConsulta[]> {
    const { consultar, alFallar, esperar = esperarDeVerdad } = this.dependencias;
    const resumenes: ResumenDeConsulta[] = [];
    for (const [posicion, moneda] of monedas.entries()) {
      if (posicion > 0) await esperar(PAUSA_ENTRE_MONEDAS_EN_MS);
      const operacion = base.operacion ?? (esElDolar(moneda) ? 'TipoCambioRango' : 'TipoCambioRangoMoneda');
      try {
        resumenes.push(await consultar.ejecutar({ ...base, operacion, moneda }));
      } catch (error) {
        alFallar(`Carga de ${moneda.moneda} (${base.vuelta})`, error);
      }
    }
    return resumenes;
  }
}
