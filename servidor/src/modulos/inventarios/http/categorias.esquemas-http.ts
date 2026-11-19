import { z } from 'zod';
import { opcionObligatoria, textoObligatorio } from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar una categoría; las reglas de negocio las revisa el dominio. */
export const esquemaCategoria = z.object({
  nombre: textoObligatorio(80),
  tipoDeInventarioPorOmision: opcionObligatoria([
    'mercaderia',
    'materia_prima',
    'suministros',
    'producto_en_proceso',
    'producto_terminado',
    'repuestos',
    'empaques',
  ]),
  activo: z.boolean().default(true),
});

export const esquemaParamsCategoria = z.object({ categoriaId: z.uuid() });

export type CategoriaSolicitado = z.infer<typeof esquemaCategoria>;
export type ParamsCategoria = z.infer<typeof esquemaParamsCategoria>;
