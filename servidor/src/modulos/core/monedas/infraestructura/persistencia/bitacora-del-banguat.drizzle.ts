import { desc, eq, isNotNull, max, sql } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type {
  BitacoraDelBanguat,
  ConsultaGuardada,
  MonedaConCodigoDelBanguat,
} from '../../aplicacion/puertos/bitacora-del-banguat.js';
import { consultasAlBanguat } from './consultas-al-banguat.tablas.js';
import { monedas } from './monedas.tablas.js';
import { tiposDeCambio } from './tipos-de-cambio.tablas.js';

/** Lee la bitácora y el estado de las series; son tablas de toda la instalación, sin empresa. */
export class BitacoraDelBanguatDrizzle implements BitacoraDelBanguat {
  constructor(private readonly bd: BaseDatos) {}

  async ultimasConsultas(opciones: { limite: number; moneda?: string | undefined }): Promise<ConsultaGuardada[]> {
    const tabla = consultasAlBanguat;
    const filas = await this.bd
      .select({
        id: tabla.id,
        iniciadaEn: tabla.iniciadaEn,
        terminadaEn: tabla.terminadaEn,
        operacion: tabla.operacion,
        vuelta: tabla.vuelta,
        moneda: tabla.moneda,
        codigoBanguat: tabla.codigoBanguat,
        desde: tabla.desde,
        hasta: tabla.hasta,
        resultado: tabla.resultado,
        filasNuevas: tabla.filasNuevas,
        filasRechazadas: tabla.filasRechazadas,
        detalle: tabla.detalle,
        aPedido: sql<boolean>`${tabla.disparadaPor} is not null`,
      })
      .from(tabla)
      .where(opciones.moneda ? eq(tabla.moneda, opciones.moneda) : undefined)
      .orderBy(desc(tabla.iniciadaEn))
      .limit(opciones.limite);
    return filas;
  }

  async monedasConCodigo(): Promise<MonedaConCodigoDelBanguat[]> {
    const filas = await this.bd
      .select({
        moneda: monedas.codigo,
        nombre: monedas.nombre,
        codigoBanguat: monedas.codigoBanguat,
        activa: monedas.activa,
        ultimaFecha: max(tiposDeCambio.fecha),
      })
      .from(monedas)
      .leftJoin(tiposDeCambio, eq(tiposDeCambio.moneda, monedas.codigo))
      .where(isNotNull(monedas.codigoBanguat))
      .groupBy(monedas.codigo, monedas.nombre, monedas.codigoBanguat, monedas.activa)
      .orderBy(monedas.nombre);
    return filas.map((fila) => ({ ...fila, codigoBanguat: fila.codigoBanguat! }));
  }
}
