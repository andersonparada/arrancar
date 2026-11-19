import { z } from 'zod';
import { idOpcional, textoObligatorio, textoOpcional } from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar una bodega; las reglas de negocio las revisa el dominio. */
export const esquemaBodega = z.object({
  codigo: textoObligatorio(12),
  nombre: textoObligatorio(120),
  localidadId: idOpcional(),
  responsable: textoOpcional(150),
  responsableUsuarioId: idOpcional(),
  activo: z.boolean().default(true),
});

export const esquemaParamsBodega = z.object({ bodegaId: z.uuid() });

export type BodegaSolicitado = z.infer<typeof esquemaBodega>;
export type ParamsBodega = z.infer<typeof esquemaParamsBodega>;
