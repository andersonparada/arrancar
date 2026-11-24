import { z } from 'zod';
import {
  correoOpcional,
  nitOpcional,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { seccionesAportadas } from '../../core/compartido/http/secciones-aportadas.js';

export const esquemaEmpresa = z.object({
  nombre: textoObligatorio(120),
  nit: nitOpcional,
  direccion: textoOpcional(250),
  telefono: textoOpcional(30),
  correo: correoOpcional,
  activa: z.boolean().default(true),
  /** Por qué se quita o reemplaza el NIT; solo se lee al editar (A-10). */
  motivoDelNit: textoOpcional(250),
  /** Lo que los módulos activos aportan al formulario (por ejemplo, los datos fiscales de Libro de compras). */
  secciones: seccionesAportadas,
});

export const esquemaParamsEmpresa = z.object({ empresaId: z.uuid() });

export type EmpresaSolicitada = z.infer<typeof esquemaEmpresa>;
export type ParamsEmpresa = z.infer<typeof esquemaParamsEmpresa>;
