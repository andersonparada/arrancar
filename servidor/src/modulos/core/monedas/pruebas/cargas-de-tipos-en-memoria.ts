import type {
  CargasDeTipos,
  CerrojoDeCarga,
  ConsultaHecha,
  ConsultaReciente,
  ResultadoDeActualizarLista,
} from '../aplicacion/puertos/cargas-de-tipos.js';
import type { MonedaDelBanguat, MonedaPedida, PublicacionDeTipoDeCambio } from '../dominio/publicacion.js';

/** Las cargas en memoria: las monedas a cargar, lo guardado y la bitácora, para probar las vueltas sin base de datos. */
export class CargasDeTiposEnMemoria implements CargasDeTipos {
  monedas: MonedaPedida[] = [
    { moneda: 'USD', codigoBanguat: 2 },
    { moneda: 'EUR', codigoBanguat: 24 },
  ];
  readonly tipos: PublicacionDeTipoDeCambio[] = [];
  readonly consultas: ConsultaHecha[] = [];
  /** Cuántas veces se actualizó la lista y con qué. */
  readonly listas: (readonly MonedaDelBanguat[])[] = [];
  estadoDeLista = { vistaPorUltimaVez: new Date('2026-11-17T12:00:00Z') as Date | null, monedas: 5 };

  /** Un valor del Banguat ya guardado. */
  poner(moneda: string, fecha: string, referencia = '1'): void {
    this.tipos.push({ moneda, codigoBanguat: moneda === 'USD' ? 2 : 24, fecha, referencia });
  }

  async monedasACargar(): Promise<MonedaPedida[]> {
    return this.monedas;
  }

  async fechasConTipoDelBanguat(moneda: string, desde: string, hasta: string): Promise<string[]> {
    return this.tipos.filter((t) => t.moneda === moneda && t.fecha >= desde && t.fecha <= hasta).map((t) => t.fecha);
  }

  async valorAnterior(moneda: string, desde: string, antesDe: string): Promise<string | null> {
    const previos = this.tipos.filter((t) => t.moneda === moneda && t.fecha >= desde && t.fecha < antesDe);
    return previos.sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1)?.referencia ?? null;
  }

  async consultasDesde(desde: Date): Promise<ConsultaReciente[]> {
    return this.consultas.filter((c) => c.iniciadaEn >= desde);
  }

  async guardar(consulta: ConsultaHecha, publicaciones: readonly PublicacionDeTipoDeCambio[]): Promise<number> {
    const nuevas = publicaciones.filter((p) => !this.tipos.some((t) => t.moneda === p.moneda && t.fecha === p.fecha));
    this.consultas.push(consulta);
    this.tipos.push(...nuevas);
    return nuevas.length;
  }

  async actualizarLista(lista: readonly MonedaDelBanguat[], _ahora: Date, consulta: ConsultaHecha) {
    this.consultas.push(consulta);
    this.listas.push(lista);
    return { nuevas: lista.length, noDisponibles: 0 } satisfies ResultadoDeActualizarLista;
  }

  async estadoDeLaLista() {
    return this.estadoDeLista;
  }
}

/** Un cerrojo que se puede dejar tomado, como si otra instancia estuviera cargando. */
export class CerrojoDeCargaEnMemoria implements CerrojoDeCarga {
  ocupado = false;

  async ejecutarSiLibre<Resultado>(trabajo: () => Promise<Resultado>): Promise<Resultado | null> {
    if (this.ocupado) return null;
    this.ocupado = true;
    try {
      return await trabajo();
    } finally {
      this.ocupado = false;
    }
  }
}
