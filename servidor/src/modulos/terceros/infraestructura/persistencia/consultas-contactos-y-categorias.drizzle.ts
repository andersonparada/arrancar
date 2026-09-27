import { asc, eq } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { CategoriaDto } from '../../aplicacion/dto/categoria.dto.js';
import type { ContactoDto } from '../../aplicacion/dto/contacto.dto.js';
import type { ConsultasCategorias, ConsultasContactos } from '../../aplicacion/puertos/consultas.js';
import { mapeadorDeCategoria, mapeadorDeContacto } from './contacto-y-categoria.mapeador.js';
import { contactos } from './contactos.tablas.js';
import { categoriasProveedor } from './proveedores.tablas.js';

export class ConsultasContactosDrizzle implements ConsultasContactos {
  async listarDeTercero(terceroId: string): Promise<ContactoDto[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(contactos)
      .where(eq(contactos.terceroId, terceroId))
      .orderBy(asc(contactos.nombre));
    return filas.map(mapeadorDeContacto.aDto);
  }

  async obtener(contactoId: string): Promise<ContactoDto> {
    const [fila] = await transaccionEnCurso().select().from(contactos).where(eq(contactos.id, contactoId));
    if (!fila) throw new RecursoNoEncontrado('El contacto');
    return mapeadorDeContacto.aDto(fila);
  }
}

export class ConsultasCategoriasDrizzle implements ConsultasCategorias {
  async listar(): Promise<CategoriaDto[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(categoriasProveedor)
      .orderBy(asc(categoriasProveedor.nombre));
    return filas.map(mapeadorDeCategoria.aDto);
  }

  async obtener(categoriaId: string): Promise<CategoriaDto> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(categoriasProveedor)
      .where(eq(categoriasProveedor.id, categoriaId));
    if (!fila) throw new RecursoNoEncontrado('La categoría de proveedor');
    return mapeadorDeCategoria.aDto(fila);
  }
}
