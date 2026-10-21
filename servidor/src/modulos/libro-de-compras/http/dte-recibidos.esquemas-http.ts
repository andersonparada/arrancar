import { z } from 'zod';
import {
  REGIMENES_DE_ISR_DE_PROVEEDOR,
  REGIMENES_DE_IVA_DE_PROVEEDOR,
} from '../dominio/datos-fiscales-de-proveedor.js';
import { DESTINOS_DE_DOCUMENTO } from '../dominio/destinos-de-documento.js';
import { ESTADOS_DE_DTE } from '../dominio/estado-de-dte.js';
import { TIPOS_DTE } from '../dominio/tipos-de-documento.js';

const LIMITE_POR_OMISION = 50;
const LIMITE_MAXIMO = 200;
/** Filas que se completan o descartan en una solicitud. */
const MAXIMO_DE_FILAS_A_COMPLETAR = 500;
/** Filas que se confirman o previsualizan en una solicitud: cada una es un registro completo. */
export const MAXIMO_DE_FILAS_A_CONFIRMAR = 100;

export const esquemaParamsDeDte = z.object({ dteId: z.uuid() });

const idsHasta = (maximo: number) => z.array(z.uuid()).min(1).max(maximo);

/** `true` o `false` escritos en la dirección (`?conProveedor=false`). */
const booleanoDeLaDireccion = z.enum(['true', 'false']).transform((valor) => valor === 'true');

/** Filtros y página de la bandeja: `desde` y `hasta` miden la fecha de emisión (incluidas). */
export const esquemaFiltroDeDteRecibidos = z.object({
  estado: z.enum(ESTADOS_DE_DTE).optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  busqueda: z.string().trim().max(60).optional(),
  tipoDte: z.enum(TIPOS_DTE).optional(),
  loteId: z.uuid().optional(),
  conProveedor: booleanoDeLaDireccion.optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

/** Lo que cambia el borrador de las filas: lo que no viene no se toca y `null` lo deja sin completar. */
const esquemaCambiosAlBorrador = z.strictObject({
  proveedorId: z.uuid().nullable().optional(),
  conceptoId: z.uuid().nullable().optional(),
  destino: z.enum(DESTINOS_DE_DOCUMENTO).nullable().optional(),
  fechaRecepcion: z.iso.date().nullable().optional(),
  periodo: z.iso.date().nullable().optional(),
  noVinculado: z.boolean().optional(),
  documentoAfectadoId: z.uuid().nullable().optional(),
});

export const esquemaCompletarDteRecibidos = z.object({
  ids: idsHasta(MAXIMO_DE_FILAS_A_COMPLETAR),
  cambios: esquemaCambiosAlBorrador.default({}),
  /** Los campos que se llenan con la propuesta de cada fila, por ejemplo `fechaRecepcion` («Usar la fecha de emisión»). */
  aplicarPropuestas: z
    .array(z.enum(['proveedorId', 'conceptoId', 'destino', 'fechaRecepcion', 'periodo']))
    .max(5)
    .default([]),
});

/** Lo que el usuario contesta de un proveedor sin datos fiscales guardados (opción C); la clave es su id o, si es nuevo, su NIT. */
const esquemaDatosFiscales = z.object({
  regimenIva: z.enum(REGIMENES_DE_IVA_DE_PROVEEDOR).nullish(),
  regimenIsr: z.enum(REGIMENES_DE_ISR_DE_PROVEEDOR),
  esAgenteDeRetencionIva: z.boolean(),
});

const esquemaDatosFiscalesPorProveedor = z.record(z.string().max(40), esquemaDatosFiscales).default({});

export const esquemaConfirmarDteRecibidos = z.object({
  ids: idsHasta(MAXIMO_DE_FILAS_A_CONFIRMAR),
  datosFiscalesPorProveedor: esquemaDatosFiscalesPorProveedor,
});

export const esquemaDescartarDteRecibidos = z.object({
  ids: idsHasta(MAXIMO_DE_FILAS_A_COMPLETAR),
  motivo: z.string().trim().min(1, 'Campo obligatorio.'),
});

export type ParamsDeDte = z.infer<typeof esquemaParamsDeDte>;
export type FiltroDeDteRecibidosSolicitado = z.output<typeof esquemaFiltroDeDteRecibidos>;
export type CompletarDteRecibidosSolicitado = z.output<typeof esquemaCompletarDteRecibidos>;
export type ConfirmarDteRecibidosSolicitado = z.output<typeof esquemaConfirmarDteRecibidos>;
export type DescartarDteRecibidosSolicitado = z.output<typeof esquemaDescartarDteRecibidos>;
