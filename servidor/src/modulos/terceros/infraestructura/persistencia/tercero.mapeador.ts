import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { crearSiHayTexto, valorDe } from '../../../core/compartido/dominio/objeto-valor.js';
import { Correo } from '../../../core/compartido/dominio/objetos-valor/correo.js';
import { Dpi } from '../../../core/compartido/dominio/objetos-valor/dpi.js';
import { Nit } from '../../../core/compartido/dominio/objetos-valor/nit.js';
import { Telefono } from '../../../core/compartido/dominio/objetos-valor/telefono.js';
import type { PapelDeClienteDto, PapelDeProveedorDto, TerceroDto } from '../../aplicacion/dto/tercero.dto.js';
import { IdentidadDeTercero, type TipoDeTercero } from '../../dominio/identidad-de-tercero.js';
import type { ClaseDeCliente, PapelDeCliente, PapelDeProveedor } from '../../dominio/papeles.js';
import { Tercero, type PapelesDeTercero } from '../../dominio/tercero.js';
import type { clientes } from './clientes.tablas.js';
import type { proveedores } from './proveedores.tablas.js';
import type { terceros } from './terceros.tablas.js';

export type FilaTercero = typeof terceros.$inferSelect;
export type FilaCliente = typeof clientes.$inferSelect;
export type FilaProveedor = typeof proveedores.$inferSelect;

export interface FilasDePapeles {
  cliente?: FilaCliente;
  proveedor?: FilaProveedor;
}

function papelDeCliente(fila: FilaCliente): PapelDeCliente {
  return { tipo: 'cliente', clase: fila.clase as ClaseDeCliente, activo: fila.activo, notas: fila.notas };
}

function papelDeProveedor(fila: FilaProveedor): PapelDeProveedor {
  return { tipo: 'proveedor', categoriaId: fila.categoriaId, activo: fila.activo, notas: fila.notas };
}

function papelesDesde(filas: FilasDePapeles): PapelesDeTercero {
  return {
    ...(filas.cliente && { cliente: papelDeCliente(filas.cliente) }),
    ...(filas.proveedor && { proveedor: papelDeProveedor(filas.proveedor) }),
  };
}

/** Traduce entre las filas de `terceros.*`, la entidad y lo que ve el usuario. */
export const mapeadorDeTercero = {
  aEntidad(fila: FilaTercero, papeles: FilasDePapeles): Tercero {
    return Tercero.reconstruir({
      id: Identificador.desde(fila.id),
      cuentaId: Identificador.desde(fila.cuentaId),
      identidad: IdentidadDeTercero.crear(fila.tipo as TipoDeTercero, fila),
      nit: crearSiHayTexto(fila.nit, Nit.crear),
      dpi: crearSiHayTexto(fila.dpi, Dpi.crear),
      telefono: crearSiHayTexto(fila.telefono, Telefono.crear),
      whatsapp: crearSiHayTexto(fila.whatsapp, Telefono.crear),
      correo: crearSiHayTexto(fila.correo, Correo.crear),
      ubicacion: {
        departamentoCodigo: fila.departamentoCodigo,
        municipioCodigo: fila.municipioCodigo,
        direccion: fila.direccion,
      },
      fotoArchivoId: fila.fotoArchivoId,
      notas: fila.notas,
      activo: fila.activo,
      papeles: papelesDesde(papeles),
    });
  },

  aFila(tercero: Tercero): typeof terceros.$inferInsert {
    const { id, cuentaId, identidad, nit, dpi, telefono, whatsapp, correo, ubicacion, fotoArchivoId, notas, activo } =
      tercero.instantanea();
    return {
      id: id.valor,
      cuentaId: cuentaId.valor,
      tipo: identidad.tipo,
      ...identidad.nombres,
      nombreMostrar: identidad.nombreParaMostrar,
      nit: valorDe(nit),
      dpi: valorDe(dpi),
      telefono: valorDe(telefono),
      whatsapp: valorDe(whatsapp),
      correo: valorDe(correo),
      ...ubicacion,
      fotoArchivoId,
      notas,
      activo,
    };
  },

  aDto(fila: FilaTercero): TerceroDto {
    const { cuentaId, creadoEn, creadoPor, actualizadoPor, ...visibles } = fila;
    return { ...visibles, tipo: fila.tipo as TipoDeTercero };
  },

  clienteADto(fila: FilaCliente): PapelDeClienteDto {
    return { id: fila.id, clase: fila.clase as ClaseDeCliente, activo: fila.activo, notas: fila.notas };
  },

  proveedorADto(fila: FilaProveedor): PapelDeProveedorDto {
    return { id: fila.id, categoriaId: fila.categoriaId, activo: fila.activo, notas: fila.notas };
  },
};
