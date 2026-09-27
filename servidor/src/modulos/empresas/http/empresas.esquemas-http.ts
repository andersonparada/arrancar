import { z } from 'zod';
import {
  correoOpcional,
  nitOpcional,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';

export const esquemaEmpresa = z.object({
  nombre: textoObligatorio(120),
  nit: nitOpcional,
  direccion: textoOpcional(250),
  telefono: textoOpcional(30),
  correo: correoOpcional,
  activa: z.boolean().default(true),
});

export const esquemaParamsEmpresa = z.object({ empresaId: z.uuid() });

export type EmpresaSolicitada = z.infer<typeof esquemaEmpresa>;
export type ParamsEmpresa = z.infer<typeof esquemaParamsEmpresa>;
