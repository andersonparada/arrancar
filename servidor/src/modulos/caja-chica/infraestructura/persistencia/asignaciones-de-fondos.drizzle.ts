import { and, asc, eq, type SQL } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresaUsuarios } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { MiembroDeLaEmpresa } from '../../aplicacion/dto/accesos-a-fondos.dto.js';
import type {
  AsignacionDeFondo,
  AsignacionesDeFondos,
  FondoDeLaEmpresa,
} from '../../aplicacion/puertos/asignaciones-de-fondos.js';
import { accesosAFondos } from './accesos-a-fondos.tablas.js';
import { fondos } from './fondos.tablas.js';

const columnasDeMiembro = {
  usuarioId: usuarios.id,
  usuario: usuarios.usuario,
  nombres: usuarios.nombres,
  apellidos: usuarios.apellidos,
};

/**
 * La tabla de accesos solo tiene seguridad por empresa; las escrituras solo las deja pasar la base de datos dentro de la
 * ventana de asignación, y `todas` cruza con `fondos` (ya abierta en ella).
 */
export class AsignacionesDeFondosDrizzle implements AsignacionesDeFondos {
  miembros(): Promise<MiembroDeLaEmpresa[]> {
    return this.consultaDeMiembros();
  }

  async miembro(usuarioId: string): Promise<MiembroDeLaEmpresa | null> {
    return (await this.consultaDeMiembros(eq(usuarios.id, usuarioId)))[0] ?? null;
  }

  fondos(): Promise<FondoDeLaEmpresa[]> {
    return transaccionEnCurso()
      .select({ id: fondos.id, nombre: fondos.nombre, estado: fondos.estado })
      .from(fondos)
      .orderBy(asc(fondos.nombre));
  }

  todas(): Promise<AsignacionDeFondo[]> {
    return transaccionEnCurso()
      .select({ usuarioId: accesosAFondos.usuarioId, fondoId: accesosAFondos.fondoId })
      .from(accesosAFondos)
      .innerJoin(fondos, eq(fondos.id, accesosAFondos.fondoId));
  }

  async fondoIdsDelUsuario(usuarioId: string): Promise<string[]> {
    const filas = await transaccionEnCurso()
      .select({ fondoId: accesosAFondos.fondoId })
      .from(accesosAFondos)
      .innerJoin(fondos, eq(fondos.id, accesosAFondos.fondoId))
      .where(eq(accesosAFondos.usuarioId, usuarioId));
    return filas.map((fila) => fila.fondoId);
  }

  async asignar({ usuarioId, fondoId }: AsignacionDeFondo): Promise<void> {
    await transaccionEnCurso()
      .insert(accesosAFondos)
      .values({ empresaId: deLaTransaccion.empresa(), usuarioId, fondoId });
  }

  async quitar({ usuarioId, fondoId }: AsignacionDeFondo): Promise<void> {
    await transaccionEnCurso()
      .delete(accesosAFondos)
      .where(and(eq(accesosAFondos.usuarioId, usuarioId), eq(accesosAFondos.fondoId, fondoId)));
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
