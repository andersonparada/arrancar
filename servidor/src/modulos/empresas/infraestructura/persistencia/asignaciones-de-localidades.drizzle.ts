import { and, asc, eq, type SQL } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { empresaUsuarios } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { MiembroDeLaEmpresa } from '../../aplicacion/dto/accesos-a-localidades.dto.js';
import type {
  AsignacionDeLocalidad,
  AsignacionesDeLocalidades,
} from '../../aplicacion/puertos/asignaciones-de-localidades.js';
import { accesosALocalidades } from './accesos-a-localidades.tablas.js';
import { localidades } from './localidades.tablas.js';

const columnasDeMiembro = {
  usuarioId: usuarios.id,
  usuario: usuarios.usuario,
  nombres: usuarios.nombres,
  apellidos: usuarios.apellidos,
};

/**
 * La tabla de accesos solo tiene seguridad por empresa; las escrituras solo las deja pasar la base de
 * datos dentro de la ventana de asignación, y `todas` cruza con `localidades` (ya abierta en ella).
 */
export class AsignacionesDeLocalidadesDrizzle implements AsignacionesDeLocalidades {
  miembros(): Promise<MiembroDeLaEmpresa[]> {
    return this.consultaDeMiembros();
  }

  async miembro(usuarioId: string): Promise<MiembroDeLaEmpresa | null> {
    return (await this.consultaDeMiembros(eq(usuarios.id, usuarioId)))[0] ?? null;
  }

  todas(): Promise<AsignacionDeLocalidad[]> {
    return transaccionEnCurso()
      .select({ usuarioId: accesosALocalidades.usuarioId, localidadId: accesosALocalidades.localidadId })
      .from(accesosALocalidades)
      .innerJoin(localidades, eq(localidades.id, accesosALocalidades.localidadId));
  }

  async localidadIdsDelUsuario(usuarioId: string): Promise<string[]> {
    const filas = await transaccionEnCurso()
      .select({ localidadId: accesosALocalidades.localidadId })
      .from(accesosALocalidades)
      .innerJoin(localidades, eq(localidades.id, accesosALocalidades.localidadId))
      .where(eq(accesosALocalidades.usuarioId, usuarioId));
    return filas.map((fila) => fila.localidadId);
  }

  async asignar({ usuarioId, localidadId }: AsignacionDeLocalidad): Promise<void> {
    await transaccionEnCurso()
      .insert(accesosALocalidades)
      .values({ empresaId: deLaTransaccion.empresa(), usuarioId, localidadId });
  }

  async quitar({ usuarioId, localidadId }: AsignacionDeLocalidad): Promise<void> {
    await transaccionEnCurso()
      .delete(accesosALocalidades)
      .where(and(eq(accesosALocalidades.usuarioId, usuarioId), eq(accesosALocalidades.localidadId, localidadId)));
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
