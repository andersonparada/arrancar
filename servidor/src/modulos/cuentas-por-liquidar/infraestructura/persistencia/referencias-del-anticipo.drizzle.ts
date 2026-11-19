import { and, eq } from 'drizzle-orm';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresaUsuarios } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { ReferenciasDelAnticipo } from '../../aplicacion/puertos/puertos-de-anticipos.js';

/**
 * Lo que el anticipo valida de otras tablas (lectura): los terceros son de la cuenta (RLS por cuenta), y el usuario y la
 * localidad, de la empresa del contexto.
 */
export class ReferenciasDelAnticipoDrizzle implements ReferenciasDelAnticipo {
  async nombreDelTercero(terceroId: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ nombre: terceros.nombreMostrar })
      .from(terceros)
      .where(and(eq(terceros.id, terceroId), eq(terceros.activo, true)));
    return fila?.nombre ?? null;
  }

  async usuarioDeLaEmpresa(usuarioId: string): Promise<boolean> {
    const { empresaId } = contextoEnCurso();
    const [fila] = await transaccionEnCurso()
      .select({ id: usuarios.id })
      .from(usuarios)
      .innerJoin(empresaUsuarios, eq(empresaUsuarios.usuarioId, usuarios.id))
      .where(and(eq(usuarios.id, usuarioId), eq(usuarios.activo, true), eq(empresaUsuarios.empresaId, empresaId)));
    return fila !== undefined;
  }

  async localidadDeLaEmpresa(localidadId: string): Promise<boolean> {
    const { empresaId } = contextoEnCurso();
    const [fila] = await transaccionEnCurso()
      .select({ id: localidades.id })
      .from(localidades)
      .where(and(eq(localidades.id, localidadId), eq(localidades.empresaId, empresaId)));
    return fila !== undefined;
  }
}
