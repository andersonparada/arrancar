import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  RepositorioCategorias,
  RepositorioContactos,
  RepositorioTerceros,
} from '../../aplicacion/puertos/repositorios.js';
import type { CategoriaDeProveedor, CategoriaDeProveedorId } from '../../dominio/categoria-de-proveedor.js';
import type { Contacto, ContactoId } from '../../dominio/contacto.js';
import type { PapelDeCliente, PapelDeProveedor } from '../../dominio/papeles.js';
import type { Tercero, TerceroId } from '../../dominio/tercero.js';
import { clientes } from './clientes.tablas.js';
import { mapeadorDeCategoria, mapeadorDeContacto } from './contacto-y-categoria.mapeador.js';
import { contactos } from './contactos.tablas.js';
import { categoriasProveedor, proveedores } from './proveedores.tablas.js';
import { mapeadorDeTercero } from './tercero.mapeador.js';
import { terceros } from './terceros.tablas.js';

/** Las tablas tienen seguridad por cuenta (RLS): ninguna consulta necesita filtrar por cuenta. */
export class RepositorioTercerosDrizzle implements RepositorioTerceros {
  async buscar(id: TerceroId): Promise<Tercero | null> {
    const tx = transaccionEnCurso();
    const [fila] = await tx.select().from(terceros).where(eq(terceros.id, id.valor));
    if (!fila) return null;
    const [[cliente], [proveedor]] = await Promise.all([
      tx.select().from(clientes).where(eq(clientes.terceroId, id.valor)),
      tx.select().from(proveedores).where(eq(proveedores.terceroId, id.valor)),
    ]);
    return mapeadorDeTercero.aEntidad(fila, { cliente, proveedor });
  }

  async agregar(tercero: Tercero): Promise<void> {
    await transaccionEnCurso().insert(terceros).values(mapeadorDeTercero.aFila(tercero));
  }

  async guardar(tercero: Tercero): Promise<void> {
    const { id, cuentaId, ...cambios } = mapeadorDeTercero.aFila(tercero);
    await transaccionEnCurso().update(terceros).set(cambios).where(eq(terceros.id, tercero.id.valor));
    await this.guardarPapeles(tercero);
  }

  /** Cada papel es una fila por tercero: se inserta la primera vez y después se actualiza. */
  private async guardarPapeles(tercero: Tercero): Promise<void> {
    const deTercero = { terceroId: tercero.id.valor, cuentaId: tercero.cuentaId.valor };
    await this.guardarCliente(deTercero, tercero.papel('cliente'));
    await this.guardarProveedor(deTercero, tercero.papel('proveedor'));
  }

  private async guardarCliente(deTercero: DeTercero, cliente: PapelDeCliente | null): Promise<void> {
    if (!cliente) return;
    const { clase, activo, notas } = cliente;
    await transaccionEnCurso()
      .insert(clientes)
      .values({ ...deTercero, clase, activo, notas })
      .onConflictDoUpdate({ target: clientes.terceroId, set: { clase, activo, notas } });
  }

  private async guardarProveedor(deTercero: DeTercero, proveedor: PapelDeProveedor | null): Promise<void> {
    if (!proveedor) return;
    const { categoriaId, activo, notas } = proveedor;
    await transaccionEnCurso()
      .insert(proveedores)
      .values({ ...deTercero, categoriaId, activo, notas })
      .onConflictDoUpdate({ target: proveedores.terceroId, set: { categoriaId, activo, notas } });
  }
}

interface DeTercero {
  terceroId: string;
  cuentaId: string;
}

export class RepositorioContactosDrizzle implements RepositorioContactos {
  async buscar(id: ContactoId): Promise<Contacto | null> {
    const [fila] = await transaccionEnCurso().select().from(contactos).where(eq(contactos.id, id.valor));
    return fila ? mapeadorDeContacto.aEntidad(fila) : null;
  }

  async agregar(contacto: Contacto): Promise<void> {
    await transaccionEnCurso().insert(contactos).values(mapeadorDeContacto.aFila(contacto));
  }

  async guardar(contacto: Contacto): Promise<void> {
    const { id, cuentaId, terceroId, ...cambios } = mapeadorDeContacto.aFila(contacto);
    await transaccionEnCurso().update(contactos).set(cambios).where(eq(contactos.id, contacto.id.valor));
  }

  async eliminar(contacto: Contacto): Promise<void> {
    await transaccionEnCurso().delete(contactos).where(eq(contactos.id, contacto.id.valor));
  }
}

export class RepositorioCategoriasDrizzle implements RepositorioCategorias {
  async buscar(id: CategoriaDeProveedorId): Promise<CategoriaDeProveedor | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(categoriasProveedor)
      .where(eq(categoriasProveedor.id, id.valor));
    return fila ? mapeadorDeCategoria.aEntidad(fila) : null;
  }

  async agregar(categoria: CategoriaDeProveedor): Promise<void> {
    await transaccionEnCurso().insert(categoriasProveedor).values(mapeadorDeCategoria.aFila(categoria));
  }

  async guardar(categoria: CategoriaDeProveedor): Promise<void> {
    const { nombre, activo } = mapeadorDeCategoria.aFila(categoria);
    await transaccionEnCurso()
      .update(categoriasProveedor)
      .set({ nombre, activo })
      .where(eq(categoriasProveedor.id, categoria.id.valor));
  }
}
