import { CantidadDeDiasInvalida, DiaHabilInexistente } from '../dominio/errores.js';
import { anioDe, diaDeLaSemana, sumarDias } from '../dominio/fecha-iso.js';
import { feriadosCalculados } from '../dominio/feriados-calculados.js';
import type { Asuetos } from './puertos/asuetos.js';

const SABADO = 6;
const DOMINGO = 0;
const FORMATO_DE_MES = /^(\d{4})-(\d{2})$/;

/** Lo que otros módulos necesitan del calendario: contar días hábiles. */
export interface DiasHabiles {
  esHabil(fecha: string): Promise<boolean>;
  /** La fecha `dias` días hábiles después de `desde` (que no cuenta). Con 0 devuelve `desde`. */
  sumarDiasHabiles(desde: string, dias: number): Promise<string>;
  /** El día hábil número `numero` (desde 1) de un mes `AAAA-MM`. */
  diaHabilNumero(mes: string, numero: number): Promise<string>;
}

/**
 * Días hábiles de Guatemala: de lunes a viernes, sin feriados fijos, sin Semana Santa y sin los
 * asuetos que carga soporte. Los medios días (24 y 31 de diciembre) cuentan como hábiles.
 * Guarda en memoria, por año, las fechas no hábiles; `invalidar` la renueva al cambiar los asuetos.
 */
export class CalendarioLaboral implements DiasHabiles {
  private readonly noHabilesPorAnio = new Map<number, Promise<ReadonlySet<string>>>();

  constructor(private readonly asuetos: Pick<Asuetos, 'delAnio'>) {}

  async esHabil(fecha: string): Promise<boolean> {
    const dia = diaDeLaSemana(fecha);
    if (dia === SABADO || dia === DOMINGO) return false;
    return !(await this.noHabilesDe(anioDe(fecha))).has(fecha);
  }

  async sumarDiasHabiles(desde: string, dias: number): Promise<string> {
    if (!Number.isInteger(dias) || dias < 0) throw new CantidadDeDiasInvalida(dias);
    diaDeLaSemana(desde);
    let actual = desde;
    for (let contados = 0; contados < dias;) {
      actual = sumarDias(actual, 1);
      if (await this.esHabil(actual)) contados += 1;
    }
    return actual;
  }

  async diaHabilNumero(mes: string, numero: number): Promise<string> {
    if (!FORMATO_DE_MES.test(mes) || !Number.isInteger(numero) || numero < 1)
      throw new DiaHabilInexistente(mes, numero);
    let contados = 0;
    for (let fecha = `${mes}-01`; fecha.startsWith(mes); fecha = sumarDias(fecha, 1)) {
      if (await this.esHabil(fecha)) contados += 1;
      if (contados === numero) return fecha;
    }
    throw new DiaHabilInexistente(mes, numero);
  }

  /** Olvida lo guardado de un año; se llama al agregar o quitar un asueto. */
  invalidar(anio: number): void {
    this.noHabilesPorAnio.delete(anio);
  }

  private noHabilesDe(anio: number): Promise<ReadonlySet<string>> {
    const guardado = this.noHabilesPorAnio.get(anio);
    if (guardado) return guardado;
    const nuevo = this.cargar(anio);
    this.noHabilesPorAnio.set(anio, nuevo);
    nuevo.catch(() => this.noHabilesPorAnio.delete(anio));
    return nuevo;
  }

  private async cargar(anio: number): Promise<ReadonlySet<string>> {
    const completos = feriadosCalculados(anio).filter((f) => !f.medioDia);
    const asuetos = await this.asuetos.delAnio(anio);
    return new Set([...completos, ...asuetos].map((f) => f.fecha));
  }
}
