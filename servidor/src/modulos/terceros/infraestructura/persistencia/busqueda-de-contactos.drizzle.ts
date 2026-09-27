import { and, asc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ContactoEncontradoDto } from '../../aplicacion/dto/contacto.dto.js';
import type { BusquedaDeContactos } from '../../aplicacion/puertos/consultas.js';
import { contactos } from './contactos.tablas.js';
import { papelesDe } from './papeles-en-listado.drizzle.js';
import { terceros } from './terceros.tablas.js';

const SEPARADORES_DE_TELEFONO = /[\s\-().]/g;
const MINIMO_DE_DIGITOS = 3;

type Coincidencia = Omit<ContactoEncontradoDto, 'esCliente' | 'esProveedor'>;

interface ColumnasDeContacto {
  nombre: AnyPgColumn;
  telefono: AnyPgColumn;
  whatsapp: AnyPgColumn;
  correo: AnyPgColumn;
}

/** Por nombre o correo; y por teléfono si se escribieron dígitos, comparados sin guiones ni espacios. */
function coincide(texto: string, columnas: ColumnasDeContacto): SQL | undefined {
  const digitos = texto.replace(SEPARADORES_DE_TELEFONO, '');
  const esTelefono = digitos.length >= MINIMO_DE_DIGITOS && /^\+?\d+$/.test(digitos);
  return or(
    ilike(columnas.nombre, `%${texto}%`),
    ilike(columnas.correo, `%${texto}%`),
    esTelefono ? ilike(columnas.telefono, `%${digitos}%`) : undefined,
    esTelefono ? ilike(columnas.whatsapp, `%${digitos}%`) : undefined,
  );
}

const DATOS_DEL_TERCERO = {
  terceroId: terceros.id,
  terceroNombre: terceros.nombreMostrar,
  telefono: terceros.telefono,
  whatsapp: terceros.whatsapp,
  correo: terceros.correo,
};

/** Las tablas tienen seguridad por cuenta: solo aparecen clientes y proveedores de la cuenta. */
export class BusquedaDeContactosDrizzle implements BusquedaDeContactos {
  async buscar(texto: string, limite: number): Promise<ContactoEncontradoDto[]> {
    const [propios, deSusContactos] = await Promise.all([this.terceros(texto, limite), this.contactos(texto, limite)]);
    const encontrados = [...propios, ...deSusContactos].slice(0, limite);
    const papeles = await papelesDe([...new Set(encontrados.map((e) => e.terceroId))]);
    return encontrados.map((encontrado) => ({
      ...encontrado,
      esCliente: papeles.clientes.get(encontrado.terceroId)?.activo ?? false,
      esProveedor: papeles.proveedores.get(encontrado.terceroId)?.activo ?? false,
    }));
  }

  private async terceros(texto: string, limite: number): Promise<Coincidencia[]> {
    const filas = await transaccionEnCurso()
      .select(DATOS_DEL_TERCERO)
      .from(terceros)
      .where(and(eq(terceros.activo, true), coincide(texto, { ...terceros, nombre: terceros.nombreMostrar })))
      .orderBy(asc(terceros.nombreMostrar))
      .limit(limite);
    return filas.map((fila) => ({ ...fila, contactoNombre: null, cargo: null }));
  }

  /** Personas de contacto que coinciden, o todas las de un tercero cuyo nombre coincide. */
  private contactos(texto: string, limite: number): Promise<Coincidencia[]> {
    return transaccionEnCurso()
      .select({
        terceroId: terceros.id,
        terceroNombre: terceros.nombreMostrar,
        contactoNombre: contactos.nombre,
        cargo: contactos.cargo,
        telefono: contactos.telefono,
        whatsapp: contactos.whatsapp,
        correo: contactos.correo,
      })
      .from(contactos)
      .innerJoin(terceros, eq(terceros.id, contactos.terceroId))
      .where(
        and(eq(terceros.activo, true), or(coincide(texto, contactos), ilike(terceros.nombreMostrar, `%${texto}%`))),
      )
      .orderBy(asc(terceros.nombreMostrar), asc(contactos.nombre))
      .limit(limite);
  }
}
