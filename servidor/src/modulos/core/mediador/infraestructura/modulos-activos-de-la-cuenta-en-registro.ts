import { bd } from '../../base-datos/conexion.js';
import { Identificador } from '../../compartido/dominio/identificador.js';
import { CatalogoDeModulosEnRegistro } from '../../cuentas/infraestructura/catalogo-de-modulos-en-registro.js';
import { RepositorioCuentasDrizzle } from '../../cuentas/infraestructura/persistencia/repositorio-cuentas.drizzle.js';
import type { ModulosActivosDeLaCuenta } from '../aplicacion/puertos/modulos-activos-de-la-cuenta.js';

/**
 * Los módulos activos salen de lo que la cuenta contrató (`cuentas`) resuelto
 * contra el registro de módulos (esenciales y dependencias). Las cuentas están
 * por encima de la seguridad por filas, así que se leen fuera de la unidad de
 * trabajo, con la conexión directa.
 */
export class ModulosActivosDeLaCuentaEnRegistro implements ModulosActivosDeLaCuenta {
  private readonly repositorio = new RepositorioCuentasDrizzle(() => bd);
  private readonly catalogo = new CatalogoDeModulosEnRegistro();

  async activosPara(cuentaId: string): Promise<ReadonlySet<string>> {
    const contratados = await this.repositorio.modulosContratados(Identificador.desde(cuentaId));
    return this.catalogo.activos(contratados);
  }
}
