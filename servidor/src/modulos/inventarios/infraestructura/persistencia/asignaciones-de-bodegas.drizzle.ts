import { and, asc, eq, type SQL } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { empresaUsuarios } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { MiembroDeLaEmpresa } from '../../aplicacion/dto/accesos-a-bodegas.dto.js';
import type { AsignacionDeBodega, AsignacionesDeBodegas } from '../../aplicacion/puertos/asignaciones-de-bodegas.js';
import { accesosABodegas } from './accesos-a-bodegas.tablas.js';
import { bodegas } from './bodegas.tablas.js';

const columnasDeMiembro = {
  usuarioId: usuarios.id,
  usuario: usuarios.usuario,
  nombres: usuarios.nombres,
  apellidos: usuarios.apellidos,
};

/**
 * La tabla de accesos solo tiene seguridad por empresa; las escrituras solo las deja pasar la base de
 * datos dentro de la ventana de asignación, y `todas` cruza con `bodegas` (ya abierta en ella).
 */
export class AsignacionesDeBodegasDrizzle implements AsignacionesDeBodegas {
  miembros(): Promise<MiembroDeLaEmpresa[]> {
    return this.consultaDeMiembros();
  }

  async miembro(usuarioId: string): Promise<MiembroDeLaEmpresa | null> {
    return (await this.consultaDeMiembros(eq(usuarios.id, usuarioId)))[0] ?? null;
  }

  todas(): Promise<AsignacionDeBodega[]> {
    return transaccionEnCurso()
      .select({ usuarioId: accesosABodegas.usuarioId, bodegaId: accesosABodegas.bodegaId })
      .from(accesosABodegas)
      .innerJoin(bodegas, eq(bodegas.id, accesosABodegas.bodegaId));
  }

  async bodegaIdsDelUsuario(usuarioId: string): Promise<string[]> {
    const filas = await transaccionEnCurso()
      .select({ bodegaId: accesosABodegas.bodegaId })
      .from(accesosABodegas)
      .innerJoin(bodegas, eq(bodegas.id, accesosABodegas.bodegaId))
      .where(eq(accesosABodegas.usuarioId, usuarioId));
    return filas.map((fila) => fila.bodegaId);
  }

  async asignar({ usuarioId, bodegaId }: AsignacionDeBodega): Promise<void> {
    await transaccionEnCurso()
      .insert(accesosABodegas)
      .values({ empresaId: deLaTransaccion.empresa(), usuarioId, bodegaId });
  }

  async quitar({ usuarioId, bodegaId }: AsignacionDeBodega): Promise<void> {
    await transaccionEnCurso()
      .delete(accesosABodegas)
      .where(and(eq(accesosABodegas.usuarioId, usuarioId), eq(accesosABodegas.bodegaId, bodegaId)));
  }

  private consultaDeMiembros(filtro?: SQL): Promise<MiembroDeLaEmpresa[]> {
    return transaccionEnCurso()
      .select(columnasDeMiembro)
      .from(empresaUsuarios)
      .innerJoin(usuarios, eq(usuarios.id, empresaUsuarios.usuarioId))
      .where(and(eq(empresaUsuarios.empresaId, deLaTransaccion.empresa()), filtro))
      .orderBy(asc(usuarios.usuario));
  }
}
