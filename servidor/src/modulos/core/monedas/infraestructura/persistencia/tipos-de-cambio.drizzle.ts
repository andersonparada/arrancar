import { and, asc, between, desc, eq, lte } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import { transaccionEnCurso } from '../../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../identidad/infraestructura/persistencia/usuarios.tablas.js';
import type {
  NuevoTipoManual,
  TipoDeCambioDto,
  TiposDeCambioGuardados,
} from '../../aplicacion/puertos/tipos-de-cambio-guardados.js';
import { ejecutorActual } from './ejecutor-actual.js';
import { tiposDeCambio } from './tipos-de-cambio.tablas.js';

const COLUMNAS = {
  id: tiposDeCambio.id,
  moneda: tiposDeCambio.moneda,
  fecha: tiposDeCambio.fecha,
  referencia: tiposDeCambio.referencia,
  compra: tiposDeCambio.compra,
  venta: tiposDeCambio.venta,
  origen: tiposDeCambio.origen,
  motivo: tiposDeCambio.motivo,
  registradoPor: usuarios.usuario,
  registradoEn: tiposDeCambio.registradoEn,
};

type Fila = Omit<TipoDeCambioDto, 'registradoEn'> & { registradoEn: Date };

/** Los decimales de `numeric(16,8)` llegan con ceros de relleno (`8.81000000`); a la API van sin ellos. */
function sinCeros(texto: string): string {
  return texto.includes('.') ? texto.replace(/\.?0+$/, '') : texto;
}

const aDto = (fila: Fila): TipoDeCambioDto => ({
  ...fila,
  referencia: sinCeros(fila.referencia),
  compra: fila.compra && sinCeros(fila.compra),
  venta: fila.venta && sinCeros(fila.venta),
  registradoEn: fila.registradoEn.toISOString(),
});

/** `core.tipos_de_cambio`: toda la instalación, sin empresa ni cuenta; solo se agrega (RLS). */
export class TiposDeCambioDrizzle implements TiposDeCambioGuardados {
  constructor(private readonly bd: BaseDatos) {}

  private consulta(ejecutor = ejecutorActual(this.bd)) {
    return ejecutor
      .select(COLUMNAS)
      .from(tiposDeCambio)
      .leftJoin(usuarios, eq(tiposDeCambio.registradoPor, usuarios.id));
  }

  async vigenteHasta(moneda: string, fecha: string): Promise<TipoDeCambioDto | null> {
    const [fila] = await this.consulta()
      .where(and(eq(tiposDeCambio.moneda, moneda), lte(tiposDeCambio.fecha, fecha)))
      .orderBy(desc(tiposDeCambio.fecha), desc(tiposDeCambio.registradoEn))
      .limit(1);
    return fila ? aDto(fila) : null;
  }

  async serie(moneda: string, desde: string, hasta: string): Promise<TipoDeCambioDto[]> {
    const filas = await this.consulta()
      .where(and(eq(tiposDeCambio.moneda, moneda), between(tiposDeCambio.fecha, desde, hasta)))
      .orderBy(asc(tiposDeCambio.fecha), desc(tiposDeCambio.registradoEn));
    const vigentes = new Map<string, Fila>();
    for (const fila of filas) if (!vigentes.has(fila.fecha)) vigentes.set(fila.fecha, fila);
    return [...vigentes.values()].map(aDto);
  }

  async versiones(moneda: string, fecha: string): Promise<TipoDeCambioDto[]> {
    const filas = await this.consulta()
      .where(and(eq(tiposDeCambio.moneda, moneda), eq(tiposDeCambio.fecha, fecha)))
      .orderBy(desc(tiposDeCambio.registradoEn));
    return filas.map(aDto);
  }

  async agregarManual({ usuarioId, ...datos }: NuevoTipoManual): Promise<TipoDeCambioDto> {
    const transaccion = transaccionEnCurso();
    const [creada] = await transaccion
      .insert(tiposDeCambio)
      .values({ ...datos, origen: 'manual', registradoPor: usuarioId })
      .returning({ id: tiposDeCambio.id });
    const [fila] = await this.consulta(transaccion).where(eq(tiposDeCambio.id, creada!.id));
    return aDto(fila!);
  }
}
