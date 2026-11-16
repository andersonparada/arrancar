import { and, eq } from 'drizzle-orm';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresaUsuarios } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { CustodiosDeRetiros } from '../../aplicacion/puertos/puertos-de-retiros.js';

/** Lee de `core` (el módulo puede importar de core): el usuario debe estar activo y entrar a la empresa del contexto. */
export class CustodiosDeRetirosDrizzle implements CustodiosDeRetiros {
  async nombreDelUsuario(usuarioId: string): Promise<string | null> {
    const { empresaId } = contextoEnCurso();
    const [fila] = await transaccionEnCurso()
      .select({ nombres: usuarios.nombres, apellidos: usuarios.apellidos })
      .from(usuarios)
      .innerJoin(empresaUsuarios, eq(empresaUsuarios.usuarioId, usuarios.id))
      .where(and(eq(usuarios.id, usuarioId), eq(usuarios.activo, true), eq(empresaUsuarios.empresaId, empresaId)));
    return fila ? `${fila.nombres} ${fila.apellidos}`.trim() : null;
  }
}
