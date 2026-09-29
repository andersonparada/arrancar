import { and, asc, eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type { EmpresaSesion } from '../../../compartido/aplicacion/contexto-de-sesion.js';
import { cuentaModulos, cuentas } from '../../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas, empresaUsuarios } from '../../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { EmpresasDeLaSesion } from '../../aplicacion/puertos/empresas-de-la-sesion.js';

const columnasDeEmpresa = {
  id: empresas.id,
  nombre: empresas.nombre,
  cuentaId: empresas.cuentaId,
  cuentaNombre: cuentas.nombre,
};

const empresaYCuentaActivas = and(eq(empresas.activa, true), eq(cuentas.activa, true));

/** Se consulta antes de saber la empresa activa: conexión directa y filtros explícitos. */
export class EmpresasDeLaSesionDrizzle implements EmpresasDeLaSesion {
  constructor(private readonly bd: BaseDatos) {}

  async buscar(empresaId: string): Promise<EmpresaSesion | null> {
    const [empresa] = await this.bd
      .select(columnasDeEmpresa)
      .from(empresas)
      .innerJoin(cuentas, eq(cuentas.id, empresas.cuentaId))
      .where(eq(empresas.id, empresaId));
    return empresa ?? null;
  }

  async esMiembro(usuarioId: string, empresaId: string): Promise<boolean> {
    const [fila] = await this.bd
      .select({ usuarioId: empresaUsuarios.usuarioId })
      .from(empresaUsuarios)
      .innerJoin(empresas, eq(empresas.id, empresaUsuarios.empresaId))
      .innerJoin(cuentas, eq(cuentas.id, empresas.cuentaId))
      .where(
        and(eq(empresaUsuarios.usuarioId, usuarioId), eq(empresaUsuarios.empresaId, empresaId), empresaYCuentaActivas),
      );
    return fila !== undefined;
  }

  disponiblesPara(usuarioId: string): Promise<EmpresaSesion[]> {
    return this.bd
      .select(columnasDeEmpresa)
      .from(empresaUsuarios)
      .innerJoin(empresas, eq(empresas.id, empresaUsuarios.empresaId))
      .innerJoin(cuentas, eq(cuentas.id, empresas.cuentaId))
      .where(and(eq(empresaUsuarios.usuarioId, usuarioId), empresaYCuentaActivas))
      .orderBy(asc(cuentas.nombre), asc(empresas.nombre));
  }

  todas(): Promise<EmpresaSesion[]> {
    return this.bd
      .select(columnasDeEmpresa)
      .from(empresas)
      .innerJoin(cuentas, eq(cuentas.id, empresas.cuentaId))
      .orderBy(asc(cuentas.nombre), asc(empresas.nombre));
  }

  async modulosContratados(cuentaId: string): Promise<string[]> {
    const filas = await this.bd
      .select({ clave: cuentaModulos.moduloClave })
      .from(cuentaModulos)
      .where(eq(cuentaModulos.cuentaId, cuentaId));
    return filas.map((fila) => fila.clave);
  }
}
