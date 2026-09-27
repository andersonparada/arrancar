import { z } from 'zod';
import {
  correoOpcional,
  dpiOpcional,
  nitOpcional,
  textoOpcional,
} from '../../core/validaciones/comunes.validaciones.js';

const codigoGeografico = z
  .string()
  .regex(/^\d{2}$/, 'Código inválido.')
  .nullish()
  .transform((v) => v || null);

export const esquemaTercero = z
  .object({
    tipo: z.enum(['individual', 'juridica']),
    nombres: textoOpcional(80),
    apellidos: textoOpcional(80),
    razonSocial: textoOpcional(150),
    nombreComercial: textoOpcional(150),
    nit: nitOpcional,
    dpi: dpiOpcional,
    telefono: textoOpcional(30),
    whatsapp: textoOpcional(30),
    correo: correoOpcional,
    departamentoCodigo: codigoGeografico,
    municipioCodigo: codigoGeografico,
    direccion: textoOpcional(250),
    fotoArchivoId: z
      .uuid()
      .nullish()
      .transform((v) => v || null),
    notas: textoOpcional(1000),
    activo: z.boolean().default(true),
    /** El cliente la manda en `true` para crear o guardar aunque haya posibles duplicados. */
    confirmarDuplicado: z.boolean().default(false),
  })
  .refine((datos) => (datos.tipo === 'individual' ? !!datos.nombres : !!(datos.razonSocial || datos.nombreComercial)), {
    message: 'Falta el nombre del tercero.',
    path: ['nombres'],
  });

export const esquemaParamsTercero = z.object({ terceroId: z.uuid() });

export const esquemaListarTerceros = z.object({
  texto: z.string().trim().max(120).optional(),
  papel: z.enum(['cliente', 'proveedor', 'trabajador']).optional(),
  activo: z.coerce.boolean().optional(),
});

export type TerceroSolicitado = z.infer<typeof esquemaTercero>;
export type ParamsTercero = z.infer<typeof esquemaParamsTercero>;
export type FiltrosListarTerceros = z.infer<typeof esquemaListarTerceros>;
