import { asc, eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type { MonedaDelBanguatGuardada, MonedasDelBanguat } from '../../aplicacion/puertos/monedas.js';
import { ejecutorActual } from './ejecutor-actual.js';
import { monedasDelBanguat } from './monedas-del-banguat.tablas.js';

const COLUMNAS = {
  codigo: monedasDelBanguat.codigo,
  descripcion: monedasDelBanguat.descripcion,
  disponible: monedasDelBanguat.disponible,
  vistaPorUltimaVez: monedasDelBanguat.vistaPorUltimaVez,
};

type Fila = { codigo: number; descripcion: string; disponible: boolean; vistaPorUltimaVez: Date };

const aGuardada = (fila: Fila): MonedaDelBanguatGuardada => ({
  ...fila,
  vistaPorUltimaVez: fila.vistaPorUltimaVez.toISOString(),
});

/** `core.monedas_del_banguat`: la lista del Banguat copiada; sin RLS. */
export class MonedasDelBanguatDrizzle implements MonedasDelBanguat {
  constructor(private readonly bd: BaseDatos) {}

  async listar(): Promise<MonedaDelBanguatGuardada[]> {
    const filas = await ejecutorActual(this.bd)
      .select(COLUMNAS)
      .from(monedasDelBanguat)
      .orderBy(asc(monedasDelBanguat.descripcion));
    return filas.map(aGuardada);
  }

  async buscar(codigo: number): Promise<MonedaDelBanguatGuardada | null> {
    const [fila] = await ejecutorActual(this.bd)
      .select(COLUMNAS)
      .from(monedasDelBanguat)
      .where(eq(monedasDelBanguat.codigo, codigo));
    return fila ? aGuardada(fila) : null;
  }
}
