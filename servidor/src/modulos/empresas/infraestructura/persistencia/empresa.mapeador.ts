import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { crearSiHayTexto } from '../../../core/compartido/dominio/objeto-valor.js';
import { Correo } from '../../../core/compartido/dominio/objetos-valor/correo.js';
import { Nit } from '../../../core/compartido/dominio/objetos-valor/nit.js';
import { Telefono } from '../../../core/compartido/dominio/objetos-valor/telefono.js';
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
      nit: crearSiHayTexto(fila.nit, Nit.crear),
      direccion: fila.direccion,
      telefono: crearSiHayTexto(fila.telefono, Telefono.crear),
      correo: crearSiHayTexto(fila.correo, Correo.crear),
      monedaBase: fila.monedaBase,
      activa: fila.activa,
    });
  },

  aFila(empresa: Empresa): FilaNuevaEmpresa {
    const { id, cuentaId, nit, telefono, correo, ...resto } = empresa.instantanea();
    return {
      ...resto,
      id: id.valor,
      cuentaId: cuentaId.valor,
      nit: nit?.valor ?? null,
      telefono: telefono?.valor ?? null,
      correo: correo?.valor ?? null,
    };
  },

  aDto(fila: FilaEmpresa): EmpresaDto {
    const { id, nombre, nit, direccion, telefono, correo, monedaBase, activa, actualizadoEn } = fila;
    return { id, nombre, nit, direccion, telefono, correo, monedaBase, activa, actualizadoEn };
  },
};
