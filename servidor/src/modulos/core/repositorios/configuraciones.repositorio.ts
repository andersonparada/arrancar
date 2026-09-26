import { and, eq, or, sql, type SQL } from 'drizzle-orm';
import { bd } from '../base-datos/conexion.js';
import { configuraciones } from '../esquemas/configuraciones.esquema.js';

/** A quién aplica la configuración. Sin cuenta, solo se consideran los valores de instalación. */
export interface DestinoConfiguracion {
  cuentaId: string | null;
  empresaId: string | null;
}

export type NivelGuardado = 'instalacion' | 'cuenta' | 'empresa';

export interface ValorGuardado {
  nivel: NivelGuardado;
  clave: string;
  valor: unknown;
}

function condicionDelNivel(nivel: NivelGuardado, destino: DestinoConfiguracion): SQL | undefined {
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

export const configuracionesRepositorio = {
  /** Valores de la instalación y, si se indican, de la cuenta y la empresa. */
  async listar(destino: DestinoConfiguracion): Promise<ValorGuardado[]> {
    const condiciones = (['instalacion', 'cuenta', 'empresa'] as const)
      .map((nivel) => condicionDelNivel(nivel, destino))
      .filter((c): c is SQL => c !== undefined);
    return bd
      .select({ nivel: configuraciones.nivel, clave: configuraciones.clave, valor: configuraciones.valor })
      .from(configuraciones)
      .where(or(...condiciones));
  },

  async guardar(
    nivel: NivelGuardado,
    destino: DestinoConfiguracion,
    clave: string,
    valor: unknown,
    usuarioId: string,
  ): Promise<void> {
    const cuentaId = nivel === 'instalacion' ? null : destino.cuentaId;
    const empresaId = nivel === 'empresa' ? destino.empresaId : null;
    const objetivo = {
      instalacion: [configuraciones.clave],
      cuenta: [configuraciones.cuentaId, configuraciones.clave],
      empresa: [configuraciones.empresaId, configuraciones.clave],
    }[nivel];

    await bd
      .insert(configuraciones)
      .values({ nivel, cuentaId, empresaId, clave, valor, actualizadoPor: usuarioId })
      .onConflictDoUpdate({
        target: objetivo,
        targetWhere: sql.raw(`nivel = '${nivel}'`),
        set: { valor, actualizadoPor: usuarioId, actualizadoEn: new Date() },
      });
  },

  async eliminar(nivel: NivelGuardado, destino: DestinoConfiguracion, clave: string): Promise<void> {
    const condicion = condicionDelNivel(nivel, destino);
    if (!condicion) return;
    await bd.delete(configuraciones).where(and(condicion, eq(configuraciones.clave, clave)));
  },
};
