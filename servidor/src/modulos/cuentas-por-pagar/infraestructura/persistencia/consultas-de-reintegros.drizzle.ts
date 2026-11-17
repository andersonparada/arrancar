import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { cuentasBancarias } from '../../../bancos/infraestructura/persistencia/cuentas-bancarias.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { ConsultasDeReintegros } from '../../aplicacion/puertos/puertos-de-reintegros.js';

/**
 * Lo que se lee de Terceros y de Bancos para mostrar un reintegro (solo lectura; el `dependeDe` lo permite). Las tablas
 * tienen seguridad por cuenta y por empresa (RLS).
 */
export class ConsultasDeReintegrosDrizzle implements ConsultasDeReintegros {
  async proveedor(proveedorId: string): Promise<{ nombre: string; nit: string | null } | null> {
    const [fila] = await transaccionEnCurso()
      .select({ nombre: terceros.nombreMostrar, nit: terceros.nit })
      .from(proveedores)
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .where(eq(proveedores.id, proveedorId));
    return fila ?? null;
  }

  async nombreDeLaCuenta(cuentaBancariaId: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ nombre: cuentasBancarias.nombre })
      .from(cuentasBancarias)
      .where(eq(cuentasBancarias.id, cuentaBancariaId));
    return fila?.nombre ?? null;
  }
}
