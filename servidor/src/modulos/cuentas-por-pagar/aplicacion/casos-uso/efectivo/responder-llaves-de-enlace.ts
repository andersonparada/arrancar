import type { LlaveDeEnlace, RolDeCuenta } from '../../../../core/contratos/contabilidad.contratos.js';

/** Las categorías de proveedor de la cuenta, que son los registros con los que se enlaza el rol `proveedores`. */
export interface ConsultasDeCategoriasDeProveedor {
  listar(): Promise<Array<{ id: string; nombre: string; activo: boolean }>>;
}

/**
 * Responde la pregunta `contabilidad.llaves_de_enlace` con las categorías de proveedor (rol `proveedores`): cada
 * categoría puede tener su cuenta de Proveedores; sin categoría rige la del rol sin llave. Corre en la transacción de
 * quien pregunta. De los demás roles no dice nada.
 */
export class ResponderLlavesDeEnlaceDeCuentasPorPagar {
  constructor(private readonly categorias: ConsultasDeCategoriasDeProveedor) {}

  async ejecutar({ rol }: { rol: RolDeCuenta }): Promise<LlaveDeEnlace[] | null> {
    if (rol !== 'proveedores') return null;
    const categorias = await this.categorias.listar();
    return categorias.map(({ id, nombre, activo }) => ({ llave: id, nombre, activo }));
  }
}
