import { eq, sql } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type { EmpresaSesion } from '../../../compartido/aplicacion/contexto-de-sesion.js';
import { cuentaModulos } from '../../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import type { EmpresasDeLaSesion } from '../../aplicacion/puertos/empresas-de-la-sesion.js';

interface FilaDeEmpresa extends Record<string, unknown> {
  id: string;
  nombre: string;
  nit: string | null;
  cuenta_id: string;
  cuenta_nombre: string;
}

const aEmpresaSesion = (fila: FilaDeEmpresa): EmpresaSesion => ({
  id: fila.id,
  nombre: fila.nombre,
  nit: fila.nit,
  cuentaId: fila.cuenta_id,
  cuentaNombre: fila.cuenta_nombre,
});

/**
 * Se consulta antes de saber la empresa activa, sin variables de la transacción: `core.empresas` solo se deja leer
 * por cuenta, así que las empresas pasan por funciones `security definer` que devuelven únicamente lo que la sesión usa.
 */
export class EmpresasDeLaSesionDrizzle implements EmpresasDeLaSesion {
  constructor(private readonly bd: BaseDatos) {}

  async buscar(empresaId: string): Promise<EmpresaSesion | null> {
    const filas = await this.consultar(sql`select * from core.empresa_de_la_sesion(${empresaId}::uuid)`);
    return filas[0] ?? null;
  }

  async esMiembro(usuarioId: string, empresaId: string): Promise<boolean> {
    const filas = await this.consultar(
      sql`select * from core.empresas_del_usuario(${usuarioId}::uuid) where id = ${empresaId}::uuid`,
    );
    return filas.length > 0;
  }

  disponiblesPara(usuarioId: string): Promise<EmpresaSesion[]> {
    return this.consultar(sql`select * from core.empresas_del_usuario(${usuarioId}::uuid)`);
  }

  todas(): Promise<EmpresaSesion[]> {
    return this.consultar(sql`select * from core.todas_las_empresas()`);
  }

  private async consultar(consulta: ReturnType<typeof sql>): Promise<EmpresaSesion[]> {
    const { rows } = await this.bd.execute<FilaDeEmpresa>(consulta);
    return rows.map(aEmpresaSesion);
  }

  async modulosContratados(cuentaId: string): Promise<string[]> {
    const filas = await this.bd
      .select({ clave: cuentaModulos.moduloClave })
      .from(cuentaModulos)
      .where(eq(cuentaModulos.cuentaId, cuentaId));
    return filas.map((fila) => fila.clave);
  }
}
