import { z } from 'zod';
import {
  correoOpcional,
  dpiOpcional,
  nitOpcional,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { CLASES_DE_CLIENTE } from '../dominio/papeles.js';

const codigoGeografico = z
  .string()
  .regex(/^\d{2}$/, 'Código inválido.')
  .nullish()
  .transform((codigo) => codigo || null);

const idOpcional = z
  .uuid()
  .nullish()
  .transform((id) => id || null);

/** En la URL todo llega como texto: solo "true" y "false" son válidos. */
const booleanoDeConsulta = z.enum(['true', 'false']).transform((texto) => texto === 'true');

const camposDeTercero = z.object({
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
  fotoArchivoId: idOpcional,
  notas: textoOpcional(1000),
  activo: z.boolean().default(true),
  confirmarDuplicado: z.boolean().default(false),
});

/** Una persona necesita nombres; una empresa, razón social o nombre comercial. */
const tieneNombre = (datos: z.infer<typeof camposDeTercero>) =>
  datos.tipo === 'individual' ? !!datos.nombres : !!(datos.razonSocial || datos.nombreComercial);

const FALTA_EL_NOMBRE = { message: 'Falta el nombre del tercero.', path: ['nombres'] };

export const esquemaTercero = camposDeTercero.refine(tieneNombre, FALTA_EL_NOMBRE);

export const esquemaFiltrosDeTerceros = z.object({
  texto: z.string().trim().max(120).optional(),
  papel: z.enum(['cliente', 'proveedor']).optional(),
  activo: booleanoDeConsulta.optional(),
});

export const esquemaContacto = z.object({
  nombre: textoObligatorio(120),
  cargo: textoOpcional(80),
  telefono: textoOpcional(30),
  whatsapp: textoOpcional(30),
  correo: correoOpcional,
  notas: textoOpcional(500),
});

export const esquemaPapelDeCliente = z.object({
  clase: z.enum(CLASES_DE_CLIENTE),
  activo: z.boolean().default(true),
  notas: textoOpcional(500),
});

export const esquemaPapelDeProveedor = z.object({
  categoriaId: idOpcional,
  activo: z.boolean().default(true),
  notas: textoOpcional(500),
});

export const esquemaCategoria = z.object({
  nombre: textoObligatorio(80),
  activo: z.boolean().default(true),
});

export const esquemaParamsTercero = z.object({ terceroId: z.uuid() });
export const esquemaParamsContacto = z.object({ terceroId: z.uuid(), contactoId: z.uuid() });
export const esquemaParamsCategoria = z.object({ categoriaId: z.uuid() });

export type TerceroSolicitado = z.infer<typeof esquemaTercero>;
export type FiltrosSolicitados = z.infer<typeof esquemaFiltrosDeTerceros>;
export type ContactoSolicitado = z.infer<typeof esquemaContacto>;
export type PapelDeClienteSolicitado = z.infer<typeof esquemaPapelDeCliente>;
export type PapelDeProveedorSolicitado = z.infer<typeof esquemaPapelDeProveedor>;
export type CategoriaSolicitada = z.infer<typeof esquemaCategoria>;
export type ParamsTercero = z.infer<typeof esquemaParamsTercero>;
export type ParamsContacto = z.infer<typeof esquemaParamsContacto>;
export type ParamsCategoria = z.infer<typeof esquemaParamsCategoria>;

const papelAlRegistrar = z.discriminatedUnion('tipo', [
  esquemaPapelDeCliente.extend({ tipo: z.literal('cliente') }),
  esquemaPapelDeProveedor.extend({ tipo: z.literal('proveedor') }),
]);

/** El alta completa: datos, el papel con que entra y sus primeros contactos. */
export const esquemaAltaDeTercero = camposDeTercero
  .extend({
    papel: papelAlRegistrar.nullish().transform((papel) => papel ?? null),
    contactos: z.array(esquemaContacto).max(20).default([]),
  })
  .refine(tieneNombre, FALTA_EL_NOMBRE);

export const esquemaBusquedaDeContactos = z.object({
  texto: z.string().trim().min(2, 'Escriba al menos dos letras o números.').max(120),
});

export type AltaDeTerceroSolicitada = z.infer<typeof esquemaAltaDeTercero>;
export type BusquedaDeContactosSolicitada = z.infer<typeof esquemaBusquedaDeContactos>;
