import { z } from 'zod';
import {
  decimalObligatorio,
  decimalOpcional,
  fechaObligatoria,
  fechaOpcional,
  idObligatorio,
  idOpcional,
  opcionObligatoria,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import {
  CAUSAS_DE_ENTRADA,
  CLASES_DE_DOCUMENTO,
  DESTINOS_DE_SALIDA,
  ESTADOS_DE_TRASLADO,
} from '../dominio/documento.js';
import { TIPOS_DE_INVENTARIO } from '../dominio/tipos-de-inventario.js';

const renglon = z.object({
  articuloId: idObligatorio(),
  loteId: idOpcional(),
  cantidad: decimalObligatorio(4),
  unidadId: idOpcional(),
  costoTotal: decimalOpcional(2),
});

/** Cantidades y dinero viajan como texto; las reglas de negocio las revisa el dominio. */
export const renglones = z.array(renglon).min(1, 'Agregue al menos un renglón.').max(200);

export const esquemaEntrada = z.object({
  fecha: fechaObligatoria(),
  bodegaId: idObligatorio(),
  causa: opcionObligatoria(CAUSAS_DE_ENTRADA),
  soporte: textoObligatorio(150),
  observaciones: textoOpcional(500),
  renglones,
});

export const esquemaSalida = z.object({
  fecha: fechaObligatoria(),
  bodegaId: idObligatorio(),
  destino: opcionObligatoria(DESTINOS_DE_SALIDA),
  conceptoDeGastoId: idOpcional(),
  localidadId: idOpcional(),
  departamentoId: idOpcional(),
  entregadoA: textoOpcional(150),
  observaciones: textoOpcional(500),
  renglones,
});

export const esquemaAnulacion = z.object({ motivo: textoObligatorio(300) });

export const esquemaParamsDocumento = z.object({ documentoId: z.uuid() });
export const esquemaParamsArticulo = z.object({ articuloId: z.uuid() });

export const esquemaFiltrosDeDocumentos = z.object({
  clase: z.enum(CLASES_DE_DOCUMENTO).optional(),
  bodegaId: z.uuid().optional(),
  bodegaDeDestinoId: z.uuid().optional(),
  articuloId: z.uuid().optional(),
  estado: z.enum(['vigente', 'anulado']).optional(),
  estadoDeTraslado: z.enum(ESTADOS_DE_TRASLADO).optional(),
  desde: fechaOpcional().optional(),
  hasta: fechaOpcional().optional(),
});

export const esquemaFiltrosDeExistencias = z.object({
  bodegaId: z.uuid().optional(),
  articuloId: z.uuid().optional(),
  categoriaId: z.uuid().optional(),
  tipoDeInventario: z.enum(TIPOS_DE_INVENTARIO).optional(),
  incluirEnCero: z.stringbool().optional(),
});

export const esquemaFiltrosDeKardex = z.object({
  bodegaId: z.uuid().optional(),
  desde: fechaOpcional().optional(),
  hasta: fechaOpcional().optional(),
});

export const esquemaMetodo = z.object({ metodo: opcionObligatoria(['promedio_ponderado', 'peps']) });

export type EntradaSolicitada = z.infer<typeof esquemaEntrada>;
export type SalidaSolicitada = z.infer<typeof esquemaSalida>;
export type AnulacionSolicitada = z.infer<typeof esquemaAnulacion>;
export type ParamsDocumento = z.infer<typeof esquemaParamsDocumento>;
export type ParamsArticulo = z.infer<typeof esquemaParamsArticulo>;
export type FiltrosDeDocumentosSolicitados = z.infer<typeof esquemaFiltrosDeDocumentos>;
export type FiltrosDeExistenciasSolicitados = z.infer<typeof esquemaFiltrosDeExistencias>;
export type FiltrosDeKardexSolicitados = z.infer<typeof esquemaFiltrosDeKardex>;
export type MetodoSolicitado = z.infer<typeof esquemaMetodo>;
