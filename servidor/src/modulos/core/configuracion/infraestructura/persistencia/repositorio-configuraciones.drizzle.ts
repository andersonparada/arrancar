import { and, eq, or, sql, type SQL } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type { NivelConfiguracion } from '../../../modulos-sistema/definicion-modulo.js';
import type {
  RepositorioConfiguraciones,
  ValorAGuardar,
  ValorGuardado,
} from '../../aplicacion/puertos/repositorio-configuraciones.js';
import type { DestinoConfiguracion } from '../../dominio/destino.js';
import { configuraciones, NIVELES_GUARDADOS } from './configuraciones.tablas.js';

/** Columnas que identifican un valor en cada nivel (coinciden con los índices únicos parciales). */
const IDENTIDAD_POR_NIVEL = {
  instalacion: [configuraciones.clave],
  cuenta: [configuraciones.cuentaId, configuraciones.clave],
  empresa: [configuraciones.empresaId, configuraciones.clave],
};

function condicionDelNivel(nivel: NivelConfiguracion, destino: DestinoConfiguracion): SQL | undefined {
  if (nivel === 'instalacion') return eq(configuraciones.nivel, 'instalacion');
  if (nivel === 'cuenta') {
    return destino.cuentaId
      ? and(eq(configuraciones.nivel, 'cuenta'), eq(configuraciones.cuentaId, destino.cuentaId))
      : undefined;
  }
  return destino.empresaId
    ? and(eq(configuraciones.nivel, 'empresa'), eq(configuraciones.empresaId, destino.empresaId))
    : undefined;
}

/**
 * La tabla no tiene RLS (guarda también valores de la instalación), así que cada
 * consulta filtra por el destino y usa la conexión directa, sin unidad de trabajo.
 */
export class RepositorioConfiguracionesDrizzle implements RepositorioConfiguraciones {
  constructor(private readonly bd: BaseDatos) {}

  listar(destino: DestinoConfiguracion): Promise<ValorGuardado[]> {
    const condiciones = NIVELES_GUARDADOS.map((nivel) => condicionDelNivel(nivel, destino)).filter(
      (condicion): condicion is SQL => condicion !== undefined,
    );
    return this.bd
      .select({ nivel: configuraciones.nivel, clave: configuraciones.clave, valor: configuraciones.valor })
      .from(configuraciones)
      .where(or(...condiciones));
  }

  async guardar({ nivel, destino, clave, valor, usuarioId }: ValorAGuardar): Promise<void> {
    const cuentaId = nivel === 'instalacion' ? null : destino.cuentaId;
    const empresaId = nivel === 'empresa' ? destino.empresaId : null;
    await this.bd
      .insert(configuraciones)
      .values({ nivel, cuentaId, empresaId, clave, valor, actualizadoPor: usuarioId })
      .onConflictDoUpdate({
        target: IDENTIDAD_POR_NIVEL[nivel],
        // Literal y no parámetro: PostgreSQL solo elige el índice parcial si ve el predicado exacto.
        targetWhere: sql.raw(`nivel = '${nivel}'`),
        set: { valor, actualizadoPor: usuarioId, actualizadoEn: new Date() },
      });
  }

  async eliminar(nivel: NivelConfiguracion, destino: DestinoConfiguracion, clave: string): Promise<void> {
    const condicion = condicionDelNivel(nivel, destino);
    if (!condicion) return;
    await this.bd.delete(configuraciones).where(and(condicion, eq(configuraciones.clave, clave)));
  }
}
