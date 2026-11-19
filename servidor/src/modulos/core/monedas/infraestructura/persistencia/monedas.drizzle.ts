import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import { transaccionEnCurso } from '../../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { CambiosDeMoneda } from '../../dominio/moneda.js';
import type { CatalogoDeMonedas, MonedaDto } from '../../aplicacion/puertos/monedas.js';
import { ejecutorActual } from './ejecutor-actual.js';
import { monedasDelBanguat } from './monedas-del-banguat.tablas.js';
import { monedas } from './monedas.tablas.js';
import { tiposDeCambio } from './tipos-de-cambio.tablas.js';

const tieneSerie = sql<boolean>`exists (
  select 1 from ${tiposDeCambio} where ${tiposDeCambio.moneda} = ${monedas.codigo} and ${tiposDeCambio.origen} = 'banguat'
)`;

const COLUMNAS = {
  codigo: monedas.codigo,
  nombre: monedas.nombre,
  simbolo: monedas.simbolo,
  decimales: monedas.decimales,
  activa: monedas.activa,
  codigoBanguat: monedas.codigoBanguat,
  letrasSingular: monedas.letrasSingular,
  letrasPlural: monedas.letrasPlural,
  descripcionBanguat: monedasDelBanguat.descripcion,
  tieneSerieDelBanguat: tieneSerie,
};

/** `core.monedas`: catálogo de toda la instalación, sin RLS. */
export class MonedasDrizzle implements CatalogoDeMonedas {
  constructor(private readonly bd: BaseDatos) {}

  private consulta() {
    return ejecutorActual(this.bd)
      .select(COLUMNAS)
      .from(monedas)
      .leftJoin(monedasDelBanguat, eq(monedas.codigoBanguat, monedasDelBanguat.codigo));
  }

  listar(): Promise<MonedaDto[]> {
    return this.consulta().orderBy(desc(monedas.activa), asc(monedas.codigo));
  }

  async buscar(codigo: string): Promise<MonedaDto | null> {
    const [fila] = await this.consulta().where(eq(monedas.codigo, codigo));
    return fila ?? null;
  }

  async actualizar(codigo: string, cambios: CambiosDeMoneda): Promise<void> {
    const conValor = Object.fromEntries(Object.entries(cambios).filter(([, valor]) => valor !== undefined));
    if (Object.keys(conValor).length === 0) return;
    await transaccionEnCurso().update(monedas).set(conValor).where(eq(monedas.codigo, codigo));
  }

  async duenaDelCodigo(codigoBanguat: number): Promise<string | null> {
    const [fila] = await ejecutorActual(this.bd)
      .select({ codigo: monedas.codigo })
      .from(monedas)
      .where(eq(monedas.codigoBanguat, codigoBanguat));
    return fila?.codigo ?? null;
  }

  async codigoDeLaSerie(moneda: string): Promise<number | null> {
    const [fila] = await ejecutorActual(this.bd)
      .select({ codigo: tiposDeCambio.codigoBanguat })
      .from(tiposDeCambio)
      .where(and(eq(tiposDeCambio.moneda, moneda), eq(tiposDeCambio.origen, 'banguat')))
      .limit(1);
    return fila?.codigo ?? null;
  }
}
