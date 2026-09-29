import type { DatosFiscalesDeEmpresa } from '../../../dominio/datos-fiscales-de-empresa.js';
import type { DatosFiscalesDeProveedor } from '../../../dominio/datos-fiscales-de-proveedor.js';
import type { DatosFiscalesDeEmpresaDto, DatosFiscalesDeProveedorDto } from '../../dto/datos-fiscales.dto.js';

/** Los datos de la empresa como los ve la pantalla; `guardado` dice si vienen de una fila o son los de omisión. */
export function dtoDeEmpresa(
  empresaId: string,
  datos: DatosFiscalesDeEmpresa,
  guardado: boolean,
): DatosFiscalesDeEmpresaDto {
  return { empresaId, ...datos.instantanea(), guardado };
}

/** Los datos del proveedor como los ve la pantalla; `guardado` dice si vienen de una fila o son los de omisión. */
export function dtoDeProveedor(
  proveedorId: string,
  datos: DatosFiscalesDeProveedor,
  guardado: boolean,
): DatosFiscalesDeProveedorDto {
  return { proveedorId, ...datos.instantanea(), guardado };
}
