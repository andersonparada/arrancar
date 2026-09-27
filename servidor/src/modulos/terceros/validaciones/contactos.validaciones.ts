import { z } from 'zod';
import { correoOpcional, textoObligatorio, textoOpcional } from '../../core/validaciones/comunes.validaciones.js';

export const esquemaContacto = z.object({
  nombre: textoObligatorio(120),
  cargo: textoOpcional(80),
  telefono: textoOpcional(30),
  whatsapp: textoOpcional(30),
  correo: correoOpcional,
  notas: textoOpcional(500),
});

export const esquemaParamsContacto = z.object({ terceroId: z.uuid(), contactoId: z.uuid() });

export type ContactoSolicitado = z.infer<typeof esquemaContacto>;
export type ParamsContacto = z.infer<typeof esquemaParamsContacto>;
