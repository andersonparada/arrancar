import type {
  NuevoTipoManual,
  TipoDeCambioDto,
  TiposDeCambioGuardados,
} from '../aplicacion/puertos/tipos-de-cambio-guardados.js';

/** Los tipos guardados en memoria; la última versión agregada de un día es la vigente. */
export class TiposDeCambioEnMemoria implements TiposDeCambioGuardados {
  readonly filas: TipoDeCambioDto[] = [];
  /** Cuántas veces se pidió la vigente a la «base de datos» (para probar la memoria del servicio). */
  lecturas = 0;

  /** Agrega una versión del Banguat de un día. */
  poner(moneda: string, fecha: string, referencia: string): TipoDeCambioDto {
    return this.agregar({ moneda, fecha, referencia, origen: 'banguat' });
  }

  /** Agrega una versión manual de soporte de un día. */
  ponerManual(moneda: string, fecha: string, referencia: string): TipoDeCambioDto {
    return this.agregar({ moneda, fecha, referencia, origen: 'manual' });
  }

  private agregar({
    moneda,
    fecha,
    referencia,
    origen,
  }: Pick<TipoDeCambioDto, 'moneda' | 'fecha' | 'referencia' | 'origen'>) {
    const fila: TipoDeCambioDto = {
      id: `tipo-${this.filas.length + 1}`,
      moneda,
      fecha,
      referencia,
      compra: null,
      venta: null,
      origen,
      motivo: origen === 'manual' ? 'Prueba' : null,
      registradoPor: origen === 'manual' ? 'soporte' : null,
      registradoEn: new Date(2026, 10, 18, 6, 0, this.filas.length).toISOString(),
    };
    this.filas.push(fila);
    return fila;
  }

  async vigenteHasta(moneda: string, fecha: string): Promise<TipoDeCambioDto | null> {
    this.lecturas++;
    const delDia = this.filas.filter((f) => f.moneda === moneda && f.fecha <= fecha);
    const ultimaFecha = delDia
      .map((f) => f.fecha)
      .sort()
      .at(-1);
    return delDia.filter((f) => f.fecha === ultimaFecha).at(-1) ?? null;
  }

  async serie(moneda: string, desde: string, hasta: string): Promise<TipoDeCambioDto[]> {
    const rango = this.filas.filter((f) => f.moneda === moneda && f.fecha >= desde && f.fecha <= hasta);
    const vigentes = new Map(rango.map((f) => [f.fecha, f]));
    return [...vigentes.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  async versiones(moneda: string, fecha: string): Promise<TipoDeCambioDto[]> {
    return this.filas.filter((f) => f.moneda === moneda && f.fecha === fecha).reverse();
  }

  async agregarManual(nuevo: NuevoTipoManual): Promise<TipoDeCambioDto> {
    const fila = this.ponerManual(nuevo.moneda, nuevo.fecha, nuevo.referencia);
    Object.assign(fila, {
      compra: nuevo.compra,
      venta: nuevo.venta,
      motivo: nuevo.motivo,
      registradoPor: nuevo.usuarioId,
    });
    return fila;
  }
}
