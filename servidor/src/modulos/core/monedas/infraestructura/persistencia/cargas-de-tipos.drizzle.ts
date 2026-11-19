import { and, desc, eq, gte, inArray, isNotNull, lt, lte, ne, notInArray, sql } from 'drizzle-orm';
import type { BaseDatos, Transaccion } from '../../../base-datos/conexion.js';
import type {
  BusquedaDelPublicado,
  CargasDeTipos,
  ConsultaHecha,
  ConsultaReciente,
  DolarGuardado,
  ResultadoDeActualizarLista,
} from '../../aplicacion/puertos/cargas-de-tipos.js';
import { promedioPublicado } from '../../dominio/cruces-del-banguat.js';
import type { MonedaACargar, MonedaDelBanguat, PublicacionDeTipoDeCambio } from '../../dominio/publicacion.js';
import { consultasAlBanguat } from './consultas-al-banguat.tablas.js';
import { monedasDelBanguat } from './monedas-del-banguat.tablas.js';
import { monedas } from './monedas.tablas.js';
import { tiposDeCambio } from './tipos-de-cambio.tablas.js';

const LARGO_DEL_DETALLE = 500;
const CODIGO_DEL_DOLAR = 2;

/**
 * La carga automática sobre PostgreSQL. Los tipos y la bitácora son de toda la instalación (RLS de solo agregar), así
 * que cada escritura abre su propia transacción, sin empresa ni usuario.
 */
export class CargasDeTiposDrizzle implements CargasDeTipos {
  constructor(private readonly bd: BaseDatos) {}

  async monedasACargar(): Promise<MonedaACargar[]> {
    const filas = await this.bd
      .select({
        moneda: monedas.codigo,
        codigoBanguat: monedasDelBanguat.codigo,
        convencion: monedasDelBanguat.convencion,
      })
      .from(monedas)
      .innerJoin(monedasDelBanguat, eq(monedas.codigoBanguat, monedasDelBanguat.codigo))
      .where(and(eq(monedas.activa, true), isNotNull(monedasDelBanguat.convencion), ne(monedas.codigo, 'GTQ')))
      .orderBy(monedas.codigo);
    const dolarPrimero = (fila: { codigoBanguat: number }) => (fila.codigoBanguat === CODIGO_DEL_DOLAR ? 0 : 1);
    return filas.sort((a, b) => dolarPrimero(a) - dolarPrimero(b));
  }

  async dolaresDelBanguat(desde: string, hasta: string): Promise<DolarGuardado[]> {
    return this.bd
      .select({ id: tiposDeCambio.id, fecha: tiposDeCambio.fecha, referencia: tiposDeCambio.referencia })
      .from(tiposDeCambio)
      .where(
        and(
          eq(tiposDeCambio.codigoBanguat, CODIGO_DEL_DOLAR),
          eq(tiposDeCambio.origen, 'banguat'),
          gte(tiposDeCambio.fecha, desde),
          lte(tiposDeCambio.fecha, hasta),
        ),
      );
  }

  async publicadoAnterior(busqueda: BusquedaDelPublicado): Promise<string | null> {
    const [fila] = await this.bd
      .select({ compra: tiposDeCambio.compra, venta: tiposDeCambio.venta })
      .from(tiposDeCambio)
      .where(
        and(
          eq(tiposDeCambio.moneda, busqueda.moneda),
          eq(tiposDeCambio.origen, 'banguat'),
          eq(tiposDeCambio.convencion, busqueda.convencion),
          gte(tiposDeCambio.fecha, busqueda.desde),
          lt(tiposDeCambio.fecha, busqueda.antesDe),
        ),
      )
      .orderBy(desc(tiposDeCambio.fecha))
      .limit(1);
    return fila?.compra && fila.venta ? (promedioPublicado(fila.compra, fila.venta) ?? null) : null;
  }

  async fechasConTipoDelBanguat(moneda: string, desde: string, hasta: string): Promise<string[]> {
    const filas = await this.bd
      .selectDistinct({ fecha: tiposDeCambio.fecha })
      .from(tiposDeCambio)
      .where(
        and(
          eq(tiposDeCambio.moneda, moneda),
          eq(tiposDeCambio.origen, 'banguat'),
          gte(tiposDeCambio.fecha, desde),
          lte(tiposDeCambio.fecha, hasta),
        ),
      );
    return filas.map((fila) => fila.fecha);
  }

  async valorAnterior(moneda: string, desde: string, antesDe: string): Promise<string | null> {
    const [fila] = await this.bd
      .select({ referencia: tiposDeCambio.referencia })
      .from(tiposDeCambio)
      .where(and(eq(tiposDeCambio.moneda, moneda), gte(tiposDeCambio.fecha, desde), lt(tiposDeCambio.fecha, antesDe)))
      .orderBy(desc(tiposDeCambio.fecha), desc(tiposDeCambio.registradoEn))
      .limit(1);
    return fila?.referencia ?? null;
  }

  async consultasDesde(desde: Date): Promise<ConsultaReciente[]> {
    return this.bd
      .select({ vuelta: consultasAlBanguat.vuelta, iniciadaEn: consultasAlBanguat.iniciadaEn })
      .from(consultasAlBanguat)
      .where(gte(consultasAlBanguat.iniciadaEn, desde));
  }

  async guardar(consulta: ConsultaHecha, publicaciones: readonly PublicacionDeTipoDeCambio[]): Promise<number> {
    return this.bd.transaction(async (tx) => {
      const nuevas = await sinGuardar(tx, publicaciones);
      const id = await insertarConsulta(tx, consulta, nuevas.length);
      if (nuevas.length > 0)
        await tx
          .insert(tiposDeCambio)
          .values(nuevas.map((p) => aFila(p, id)))
          .onConflictDoNothing();
      return nuevas.length;
    });
  }

  async actualizarLista(
    lista: readonly MonedaDelBanguat[],
    ahora: Date,
    consulta: ConsultaHecha,
  ): Promise<ResultadoDeActualizarLista> {
    return this.bd.transaction(async (tx) => {
      const codigos = lista.map((m) => m.codigo);
      const conocidos = new Set(
        (await tx.select({ codigo: monedasDelBanguat.codigo }).from(monedasDelBanguat)).map((c) => c.codigo),
      );
      const nuevas = codigos.filter((codigo) => !conocidos.has(codigo)).length;
      await insertarConsulta(tx, consulta, nuevas);
      for (const moneda of lista) await guardarMoneda(tx, moneda, ahora);
      const retiradas = await tx
        .update(monedasDelBanguat)
        .set({ disponible: false })
        .where(and(eq(monedasDelBanguat.disponible, true), notInArray(monedasDelBanguat.codigo, codigos)))
        .returning({ codigo: monedasDelBanguat.codigo });
      return { nuevas, noDisponibles: retiradas.length };
    });
  }

  async estadoDeLaLista(): Promise<{ vistaPorUltimaVez: Date | null; monedas: number }> {
    const [fila] = await this.bd
      .select({
        monedas: sql<number>`count(*)::int`,
        vistaPorUltimaVez: sql<string | null>`max(${monedasDelBanguat.vistaPorUltimaVez})`,
      })
      .from(monedasDelBanguat);
    return {
      monedas: fila?.monedas ?? 0,
      vistaPorUltimaVez: fila?.vistaPorUltimaVez ? new Date(fila.vistaPorUltimaVez) : null,
    };
  }
}

/** Las publicaciones que aún no tienen fila del Banguat para su moneda y fecha. */
async function sinGuardar(
  tx: Transaccion,
  publicaciones: readonly PublicacionDeTipoDeCambio[],
): Promise<PublicacionDeTipoDeCambio[]> {
  if (publicaciones.length === 0) return [];
  const existentes = await tx
    .select({ moneda: tiposDeCambio.moneda, fecha: tiposDeCambio.fecha })
    .from(tiposDeCambio)
    .where(
      and(
        eq(tiposDeCambio.origen, 'banguat'),
        inArray(tiposDeCambio.moneda, [...new Set(publicaciones.map((p) => p.moneda))]),
        inArray(tiposDeCambio.fecha, [...new Set(publicaciones.map((p) => p.fecha))]),
      ),
    );
  const llaves = new Set(existentes.map((e) => `${e.moneda}|${e.fecha}`));
  return publicaciones.filter((p) => !llaves.has(`${p.moneda}|${p.fecha}`));
}

async function insertarConsulta(tx: Transaccion, consulta: ConsultaHecha, filasNuevas: number): Promise<string> {
  const [creada] = await tx
    .insert(consultasAlBanguat)
    .values({ ...consulta, filasNuevas, detalle: consulta.detalle?.slice(0, LARGO_DEL_DETALLE) ?? null })
    .returning({ id: consultasAlBanguat.id });
  return creada!.id;
}

const aFila = (p: PublicacionDeTipoDeCambio, consultaId: string) => ({
  moneda: p.moneda,
  fecha: p.fecha,
  referencia: p.referencia,
  compra: p.compra ?? null,
  venta: p.venta ?? null,
  convencion: p.convencion ?? (p.codigoBanguat === CODIGO_DEL_DOLAR ? ('quetzales_por_unidad' as const) : null),
  dolarUsadoId: p.dolarUsadoId ?? null,
  origen: 'banguat' as const,
  codigoBanguat: p.codigoBanguat,
  consultaId,
});

async function guardarMoneda(tx: Transaccion, { codigo, descripcion }: MonedaDelBanguat, ahora: Date): Promise<void> {
  const valores = { descripcion, disponible: true, vistaPorUltimaVez: ahora };
  await tx
    .insert(monedasDelBanguat)
    .values({ codigo, ...valores })
    .onConflictDoUpdate({ target: monedasDelBanguat.codigo, set: valores });
}
