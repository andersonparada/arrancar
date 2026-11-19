import { z } from 'zod';
import {
  decimalObligatorio,
  decimalOpcional,
  enteroObligatorio,
  fechaObligatoria,
  idObligatorio,
  idOpcional,
  opcionOpcional,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { ORIGENES_DE_ACTIVO } from '../dominio/tipos-de-activo.js';
import { CLASES_DE_COSTO_ELEGIBLES } from '../dominio/tipos-de-costo.js';

const booleanoDeConsulta = z.enum(['true', 'false']).transform((valor) => valor === 'true');

/** Filtros de la bandeja: llegan en la consulta (`?desde=2026-01-01&conPropuesta=true`). */
export const esquemaFiltrosDeBandeja = z.object({
  desde: fechaObligatoria().optional(),
  hasta: fechaObligatoria().optional(),
  proveedorId: idObligatorio().optional(),
  conceptoId: idObligatorio().optional(),
  conPropuesta: booleanoDeConsulta.optional(),
});

/** Un renglón de la cuadrícula de unidades; lo que falte se completa en la ficha y el código lo propone el correlativo. */
const esquemaDetalleDeUnidad = z.object({
  codigo: textoOpcional(30),
  numeroDeSerie: textoOpcional(80),
  placa: textoOpcional(80),
  marca: textoOpcional(80),
  modelo: textoOpcional(80),
});

/** El tope de renglones solo acota el tamaño del cuerpo; las unidades las limita el dominio (`demasiadas_unidades`). */
const RENGLONES_MAXIMOS = 1000;

export const esquemaActivoNuevo = z.object({
  descripcion: textoObligatorio(200),
  claseId: idObligatorio(),
  tipoDeRegistro: z.enum(['activo', 'bien_de_control']).default('activo'),
  origen: z.enum(ORIGENES_DE_ACTIVO).default('compra'),
  activoPadreId: idOpcional(),
  localidadId: idOpcional(),
  departamentoId: idOpcional(),
  responsable: textoOpcional(150),
  enBodega: z.boolean().default(false),
  marca: textoOpcional(80),
  modelo: textoOpcional(80),
  valorComoGanadoComun: decimalOpcional(2),
  valorDeMatricula: decimalOpcional(2),
  valorCatastral: decimalOpcional(2),
  valoresDelInmuebleCompleto: z.boolean().default(false),
  observaciones: textoOpcional(500),
  unidades: enteroObligatorio().min(1).default(1),
  cantidadPorActivo: enteroObligatorio().min(1).default(1),
  detalleDeUnidades: z.array(esquemaDetalleDeUnidad).max(RENGLONES_MAXIMOS).default([]),
});

const esquemaAsignacion = z.object({
  lineaId: idObligatorio(),
  /** Con dos decimales; negativo en las líneas de una nota de crédito. */
  monto: decimalObligatorio(2),
  activoId: idOpcional(),
  activoNuevo: esquemaActivoNuevo.nullish().transform((valor) => valor ?? null),
  altaConjuntaId: idOpcional(),
  claseDeCosto: opcionOpcional(CLASES_DE_COSTO_ELEGIBLES),
  noEsEdificacion: z.boolean().default(false),
});

/** Cuántas asignaciones caben en una petición: cada una puede crear hasta 200 unidades, y el dominio revisa el total. */
const ASIGNACIONES_MAXIMAS = 200;

export const esquemaCapitalizacion = z.object({
  asignaciones: z.array(esquemaAsignacion).min(1).max(ASIGNACIONES_MAXIMAS),
});

export const esquemaDescarte = z.object({ motivo: textoObligatorio(300) });

export const esquemaParamsLinea = z.object({ lineaId: z.uuid() });

export type FiltrosDeBandejaSolicitados = z.infer<typeof esquemaFiltrosDeBandeja>;
export type CapitalizacionSolicitada = z.infer<typeof esquemaCapitalizacion>;
export type DescarteSolicitado = z.infer<typeof esquemaDescarte>;
export type ParamsLinea = z.infer<typeof esquemaParamsLinea>;
