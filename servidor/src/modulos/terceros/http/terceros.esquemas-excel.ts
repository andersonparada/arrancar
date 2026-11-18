import { z } from 'zod';
import { CLASES_DE_CLIENTE } from '../dominio/papeles.js';
import { camposDeTercero, FALTA_EL_NOMBRE, idOpcional, tieneNombre } from './terceros.esquemas-http.js';

/** Una fila del Excel de clientes: los datos del tercero y la clase con que entra como cliente. */
export const esquemaFilaDeCliente = camposDeTercero
  .extend({ clase: z.enum(CLASES_DE_CLIENTE) })
  .refine(tieneNombre, FALTA_EL_NOMBRE);

/** Una fila del Excel de proveedores: los datos del tercero y su categoría (ya resuelta por nombre). */
export const esquemaFilaDeProveedor = camposDeTercero
  .extend({ categoriaId: idOpcional })
  .refine(tieneNombre, FALTA_EL_NOMBRE);

export type FilaDeClienteSolicitada = z.infer<typeof esquemaFilaDeCliente>;
export type FilaDeProveedorSolicitada = z.infer<typeof esquemaFilaDeProveedor>;
