import { z } from 'zod';
import { textoOpcional } from '../../core/compartido/http/esquemas-comunes.js';
import { CASOS_DE_INICIO } from '../dominio/inicio.js';

/** Forma de lo que llega al iniciar la contabilidad; las reglas de negocio las revisa el dominio. */
export const esquemaInicio = z.object({
  fecha: z.iso.date(),
  caso: z.enum(CASOS_DE_INICIO),
  mascara: z.string().trim().min(1, 'Campo obligatorio.').max(40),
  plantilla: textoOpcional(60),
  firmaRepresentante: textoOpcional(150),
  firmaContador: textoOpcional(150),
  registroDelContador: textoOpcional(30),
});

export type InicioSolicitado = z.infer<typeof esquemaInicio>;
