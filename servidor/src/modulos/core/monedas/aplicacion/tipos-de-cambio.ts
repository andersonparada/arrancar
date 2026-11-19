import { TipoDeCambioNoDisponible } from '../dominio/errores.js';
import {
  esDiaDePublicacionDeCruces,
  sumarDiasAFecha,
  ultimoDiaDePublicacionDeCrucesAntesDe,
} from '../dominio/fechas-de-publicacion.js';
import { MONEDA_BASE } from '../dominio/moneda.js';
import {
  clasificarTipo,
  type MotivoDelAnterior,
  type OrigenDelTipo,
  type TipoVigente,
} from '../dominio/tipo-vigente.js';
import type { TipoDeCambioDto, TiposDeCambioGuardados } from './puertos/tipos-de-cambio-guardados.js';

/** La moneda cuyo tipo se publica todos los días del calendario; las demás no se publican sábado ni domingo. */
const MONEDA_DE_TODOS_LOS_DIAS = 'USD';
const MAXIMO_DE_FILAS_EN_MEMORIA = 500;
/** Lo leído caduca pronto: así una corrección hecha en otra instancia llega sin reiniciar. */
const VIDA_DE_LO_LEIDO_EN_MS = 60_000;

/** La fecha de hoy en la zona horaria de la instalación. */
export interface HoyDeLaInstalacion {
  hoy(): Promise<string>;
}

interface Dependencias {
  guardados: TiposDeCambioGuardados;
  reloj: HoyDeLaInstalacion;
}

/** Lo que se sabe de una fecha sin lanzar error: el formulario decide qué mostrar si no se puede usar. */
export interface ConsultaDeTipo {
  moneda: string;
  fecha: string;
  fechaDelTipo: string | null;
  referencia: string | null;
  compra: string | null;
  venta: string | null;
  origen: OrigenDelTipo | null;
  exacto: boolean;
  motivoDelAnterior: MotivoDelAnterior | null;
  /** Se puede usar (con o sin aviso). */
  utilizable: boolean;
}

/**
 * El servicio `tiposDeCambio` del núcleo: qué tipo rige en una fecha. Es uno solo para todo el servidor (guarda en
 * memoria lo que ya leyó; `invalidar` lo renueva al agregar una versión); los módulos lo reciben al armarse, igual que
 * `calendarioLaboral`. Lee con la transacción en curso si la hay.
 */
export class TiposDeCambio {
  private readonly leidos = new Map<string, { fila: TipoDeCambioDto; vence: number }>();
  /** Sube con cada `invalidar`: una lectura que empezó antes no se guarda. */
  private generacion = 0;

  constructor(private readonly dependencias: Dependencias) {}

  /**
   * El tipo que rige en la fecha: exacto, o el anterior de hasta 7 días (con su motivo). El quetzal es siempre 1.
   * @throws TipoDeCambioNoDisponible si no hay tipo en los 7 días anteriores o la fecha es futura y no está publicada.
   */
  async vigente(moneda: string, fecha: string): Promise<TipoVigente> {
    const consulta = await this.consultar(moneda, fecha);
    if (!consulta.utilizable) throw new TipoDeCambioNoDisponible(moneda, fecha, consulta.fechaDelTipo);
    return comoTipoVigente(consulta);
  }

  /** Como `vigente`, pero sin lanzar error: dice si se puede usar y, si hay un tipo, cuál. */
  async consultar(moneda: string, fecha: string): Promise<ConsultaDeTipo> {
    if (moneda === MONEDA_BASE) return elQuetzal(fecha);
    const fila = await this.vigenteHasta(moneda, fecha);
    const clasificacion = clasificarTipo({
      fecha,
      hoy: await this.dependencias.reloj.hoy(),
      fechaDelTipo: fila?.fecha ?? null,
      diaSinCalculo: fila ? esDiaSinCalculo(moneda, fecha, fila.fecha) : false,
    });
    return { ...vacia(moneda, fecha), ...datosDe(fila), ...clasificacion };
  }

  /** El tipo vigente del último día del mes (`AAAA-MM`), para el diferencial cambiario. */
  delCierre(moneda: string, mes: string): Promise<TipoVigente> {
    return this.vigente(moneda, ultimoDiaDelMes(mes));
  }

  /** La versión vigente de cada día con tipo entre dos fechas, para los reportes. */
  serie(moneda: string, desde: string, hasta: string): Promise<TipoDeCambioDto[]> {
    return this.dependencias.guardados.serie(moneda, desde, hasta);
  }

  /** Olvida lo leído; se llama al agregar una versión (la carga automática también lo hace). */
  invalidar(): void {
    this.generacion++;
    this.leidos.clear();
  }

  private async vigenteHasta(moneda: string, fecha: string): Promise<TipoDeCambioDto | null> {
    const llave = `${moneda}|${fecha}`;
    const guardado = this.leidos.get(llave);
    if (guardado && guardado.vence > Date.now()) return guardado.fila;
    const generacion = this.generacion;
    const fila = await this.dependencias.guardados.vigenteHasta(moneda, fecha);
    if (fila && generacion === this.generacion) this.recordar(llave, fila);
    return fila;
  }

  private recordar(llave: string, fila: TipoDeCambioDto): void {
    if (this.leidos.size >= MAXIMO_DE_FILAS_EN_MEMORIA) this.leidos.clear();
    this.leidos.set(llave, { fila, vence: Date.now() + VIDA_DE_LO_LEIDO_EN_MS });
  }
}

/**
 * Sábado o domingo, con el tipo del último día de publicación, en una moneda que no se calcula esos días. Un asueto
 * entre semana sin la fila esperada no es «día sin cálculo»: el Banguat publica también en asuetos (adenda B.9).
 */
function esDiaSinCalculo(moneda: string, fecha: string, fechaDelTipo: string): boolean {
  if (fechaDelTipo === fecha || moneda === MONEDA_DE_TODOS_LOS_DIAS || esDiaDePublicacionDeCruces(fecha)) return false;
  return fechaDelTipo >= ultimoDiaDePublicacionDeCrucesAntesDe(fecha);
}

const vacia = (moneda: string, fecha: string): ConsultaDeTipo => ({
  moneda,
  fecha,
  fechaDelTipo: null,
  referencia: null,
  compra: null,
  venta: null,
  origen: null,
  exacto: false,
  motivoDelAnterior: null,
  utilizable: false,
});

const datosDe = (fila: TipoDeCambioDto | null): Partial<ConsultaDeTipo> =>
  fila
    ? {
        fechaDelTipo: fila.fecha,
        referencia: fila.referencia,
        compra: fila.compra,
        venta: fila.venta,
        origen: fila.origen,
      }
    : {};

const elQuetzal = (fecha: string): ConsultaDeTipo => ({
  ...vacia(MONEDA_BASE, fecha),
  fechaDelTipo: fecha,
  referencia: '1',
  origen: 'base',
  exacto: true,
  utilizable: true,
});

/** El último día de un mes `AAAA-MM`. @throws RangeError si el mes no es válido. */
function ultimoDiaDelMes(mes: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new RangeError(`Mes inválido: ${mes}`);
  const siguiente = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 1));
  return sumarDiasAFecha(siguiente.toISOString().slice(0, 10), -1);
}

/** Una consulta utilizable ya trae todo lo que lleva un `TipoVigente`. */
function comoTipoVigente(consulta: ConsultaDeTipo): TipoVigente {
  return {
    moneda: consulta.moneda,
    fecha: consulta.fecha,
    fechaDelTipo: consulta.fechaDelTipo!,
    referencia: consulta.referencia!,
    compra: consulta.compra,
    venta: consulta.venta,
    origen: consulta.origen!,
    exacto: consulta.exacto,
    motivoDelAnterior: consulta.motivoDelAnterior,
  };
}
