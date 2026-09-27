import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { Nit } from '../../../core/compartido/dominio/objetos-valor/nit.js';
import type { empresas } from '../../../core/esquemas/empresas.esquema.js';
import type { EmpresaDto } from '../../aplicacion/dto/empresa.dto.js';
import { Empresa } from '../../dominio/empresa.js';

type FilaEmpresa = typeof empresas.$inferSelect;
type FilaNuevaEmpresa = typeof empresas.$inferInsert;

/** Traduce entre la fila de `core.empresas`, la entidad y lo que ve el usuario. */
export const mapeadorDeEmpresa = {
  aEntidad(fila: FilaEmpresa): Empresa {
    return Empresa.reconstruir({
      id: Identificador.desde(fila.id),
      cuentaId: Identificador.desde(fila.cuentaId),
      nombre: fila.nombre,
      nit: fila.nit ? Nit.crear(fila.nit) : null,
      direccion: fila.direccion,
      telefono: fila.telefono,
      correo: fila.correo,
      monedaBase: fila.monedaBase,
      activa: fila.activa,
    });
  },

  aFila(empresa: Empresa): FilaNuevaEmpresa {
    const { id, cuentaId, nit, ...resto } = empresa.instantanea();
    return { ...resto, id: id.valor, cuentaId: cuentaId.valor, nit: nit?.valor ?? null };
  },

  aDto(fila: FilaEmpresa): EmpresaDto {
    const { id, nombre, nit, direccion, telefono, correo, monedaBase, activa, actualizadoEn } = fila;
    return { id, nombre, nit, direccion, telefono, correo, monedaBase, activa, actualizadoEn };
  },
};
