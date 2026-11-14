import { z } from 'zod';

const LIMITE_POR_OMISION = 50;
const LIMITE_MAXIMO = 200;
/** Tope de la forma de la lista; el dominio responde con su propio error por encima de 100. */
const TOPE_DE_LA_LISTA = 500;

export const esquemaParamsDeContrasena = z.object({ id: z.uuid() });
export const esquemaParamsDeDocumentoDeContrasena = z.object({ id: z.uuid(), documentoId: z.uuid() });

const fecha = (campo: string) => z.iso.date({ error: `Escriba ${campo} como AAAA-MM-DD.` });

/**
 * Crear una contraseña. Aquí solo se revisa la forma; las reglas (documentos, fechas, observaciones) son del dominio y
 * responden por campo.
 */
export const esquemaContrasena = z.object({
  proveedorId: z.uuid({ error: 'Escoja el proveedor.' }),
  fecha: fecha('la fecha').optional(),
  fechaDePago: fecha('la fecha de pago'),
  observaciones: z.string().nullable().optional(),
  documentos: z.array(z.uuid()).max(TOPE_DE_LA_LISTA),
});

/** Editar: la fecha prometida (con motivo si cambia) y las observaciones; lo que falta no se toca. */
export const esquemaEdicionDeContrasena = z.object({
  fechaDePago: fecha('la fecha de pago').optional(),
  observaciones: z.string().nullable().optional(),
  motivo: z.string().optional(),
});

export const esquemaDocumentosAgregados = z.object({ documentos: z.array(z.uuid()).max(TOPE_DE_LA_LISTA) });

/** El motivo se valida en el caso de uso (de 1 a 300 caracteres, sin espacios sobrantes). */
export const esquemaQuitarDocumento = z.object({ motivo: z.string() });

/** El motivo de la anulación se valida en el caso de uso (de 1 a 300 caracteres). */
export const esquemaAnularContrasena = z.object({ motivo: z.string() });

/** Filtros de la lista: `estado` es `vigente` por omisión; las fechas son de la contraseña y del pago prometido. */
export const esquemaFiltroDeContrasenas = z.object({
  proveedorId: z.uuid().optional(),
  estado: z.enum(['vigente', 'anulada', 'todas']).default('vigente'),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  pagoDesde: z.iso.date().optional(),
  pagoHasta: z.iso.date().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

export const esquemaDisponibles = z.object({ proveedorId: z.uuid({ error: 'Escoja el proveedor.' }) });

export type ParamsDeContrasena = z.infer<typeof esquemaParamsDeContrasena>;
export type ParamsDeDocumentoDeContrasena = z.infer<typeof esquemaParamsDeDocumentoDeContrasena>;
export type EdicionDeContrasenaSolicitada = z.infer<typeof esquemaEdicionDeContrasena>;
export type DocumentosAgregadosSolicitados = z.infer<typeof esquemaDocumentosAgregados>;
export type AnularContrasenaSolicitada = z.infer<typeof esquemaAnularContrasena>;
export type QuitarDocumentoSolicitado = z.infer<typeof esquemaQuitarDocumento>;
export type ContrasenaSolicitada = z.infer<typeof esquemaContrasena>;
export type FiltroDeContrasenasSolicitado = z.output<typeof esquemaFiltroDeContrasenas>;
export type DisponiblesSolicitado = z.infer<typeof esquemaDisponibles>;
