import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { crearSiHayTexto, valorDe } from '../../../core/compartido/dominio/objeto-valor.js';
import { Correo } from '../../../core/compartido/dominio/objetos-valor/correo.js';
import { Telefono } from '../../../core/compartido/dominio/objetos-valor/telefono.js';
import type { CategoriaDto } from '../../aplicacion/dto/categoria.dto.js';
import type { ContactoDto } from '../../aplicacion/dto/contacto.dto.js';
import { CategoriaDeProveedor } from '../../dominio/categoria-de-proveedor.js';
import { Contacto } from '../../dominio/contacto.js';
import type { contactos } from './contactos.tablas.js';
import type { categoriasProveedor } from './proveedores.tablas.js';

type FilaContacto = typeof contactos.$inferSelect;
type FilaCategoria = typeof categoriasProveedor.$inferSelect;

export const mapeadorDeContacto = {
  aEntidad(fila: FilaContacto): Contacto {
    return Contacto.reconstruir({
      id: Identificador.desde(fila.id),
      terceroId: Identificador.desde(fila.terceroId),
      cuentaId: Identificador.desde(fila.cuentaId),
      nombre: fila.nombre,
      cargo: fila.cargo,
      telefono: crearSiHayTexto(fila.telefono, Telefono.crear),
      whatsapp: crearSiHayTexto(fila.whatsapp, Telefono.crear),
      correo: crearSiHayTexto(fila.correo, Correo.crear),
      notas: fila.notas,
    });
  },

  aFila(contacto: Contacto): typeof contactos.$inferInsert {
    const { id, terceroId, cuentaId, telefono, whatsapp, correo, ...resto } = contacto.instantanea();
    return {
      ...resto,
      id: id.valor,
      terceroId: terceroId.valor,
      cuentaId: cuentaId.valor,
      telefono: valorDe(telefono),
      whatsapp: valorDe(whatsapp),
      correo: valorDe(correo),
    };
  },

  aDto({ id, nombre, cargo, telefono, whatsapp, correo, notas }: FilaContacto): ContactoDto {
    return { id, nombre, cargo, telefono, whatsapp, correo, notas };
  },
};

export const mapeadorDeCategoria = {
  aEntidad(fila: FilaCategoria): CategoriaDeProveedor {
    return CategoriaDeProveedor.reconstruir({
      id: Identificador.desde(fila.id),
      cuentaId: Identificador.desde(fila.cuentaId),
      nombre: fila.nombre,
      activo: fila.activo,
    });
  },

  aFila(categoria: CategoriaDeProveedor): typeof categoriasProveedor.$inferInsert {
    const { id, cuentaId, nombre, activo } = categoria.instantanea();
    return { id: id.valor, cuentaId: cuentaId.valor, nombre, activo };
  },

  aDto({ id, nombre, activo }: FilaCategoria): CategoriaDto {
    return { id, nombre, activo };
  },
};
