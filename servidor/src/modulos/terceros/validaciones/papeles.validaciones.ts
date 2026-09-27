import { z } from 'zod';
import { textoObligatorio, textoOpcional } from '../../core/validaciones/comunes.validaciones.js';
import { CLASES_CLIENTE } from '../esquemas/clientes.esquema.js';

const fechaOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (use AAAA-MM-DD).')
  .nullish()
  .transform((v) => v || null);

export const esquemaCliente = z.object({
  clase: z.enum(CLASES_CLIENTE),
  activo: z.boolean().default(true),
  notas: textoOpcional(500),
});

export const esquemaProveedor = z.object({
  categoriaId: z.uuid().nullish().transform((v) => v || null),
  activo: z.boolean().default(true),
  notas: textoOpcional(500),
});

export const esquemaCategoriaProveedor = z.object({
  nombre: textoObligatorio(80),
  activo: z.boolean().default(true),
});

export const esquemaTrabajador = z.object({
  cargo: textoOpcional(80),
  fechaIngreso: fechaOpcional,
  fechaSalida: fechaOpcional,
  activo: z.boolean().default(true),
  notas: textoOpcional(500),
});

export const esquemaParamsCategoriaProveedor = z.object({ categoriaId: z.uuid() });

export type ClienteSolicitado = z.infer<typeof esquemaCliente>;
export type ProveedorSolicitado = z.infer<typeof esquemaProveedor>;
export type CategoriaProveedorSolicitada = z.infer<typeof esquemaCategoriaProveedor>;
export type TrabajadorSolicitado = z.infer<typeof esquemaTrabajador>;
