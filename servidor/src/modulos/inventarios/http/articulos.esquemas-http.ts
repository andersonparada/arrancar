import { z } from 'zod';
import {
  decimalObligatorio,
  decimalOpcional,
  fechaOpcional,
  idObligatorio,
  idOpcional,
  opcionObligatoria,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { TIPOS_DE_INVENTARIO } from '../dominio/tipos-de-inventario.js';

/** Forma de lo que llega al registrar o cambiar un artículo; las reglas de negocio las revisa el dominio. */
export const esquemaArticulo = z.object({
  codigo: textoObligatorio(30),
  nombre: textoObligatorio(150),
  descripcion: textoOpcional(500),
  categoriaId: idObligatorio(),
  tipoDeInventario: opcionObligatoria(TIPOS_DE_INVENTARIO),
  unidadBaseId: idObligatorio(),
  manejaLotes: z.boolean().default(false),
  manejaVencimiento: z.boolean().default(false),
  codigoDeBarras: textoOpcional(60),
  conceptoDeGastoId: idOpcional(),
  existenciaMinima: decimalOpcional(4),
  pesoKgPorUnidadBase: decimalOpcional(4),
  activo: z.boolean().default(true),
});

export const esquemaParamsArticulo = z.object({ articuloId: z.uuid() });

/** Las conversiones del artículo («caja de 24»); la lista reemplaza a la anterior. */
export const esquemaConversiones = z.object({
  conversiones: z
    .array(
      z.object({
        unidadId: idObligatorio(),
        factor: decimalObligatorio(8),
        paraCompras: z.boolean().default(false),
      }),
    )
    .max(50),
});

/** Un lote nuevo; el vencimiento es obligatorio solo si el artículo lo maneja (lo revisa el dominio). */
export const esquemaLote = z.object({
  codigo: textoObligatorio(40),
  fechaDeVencimiento: fechaOpcional(),
  fechaDeFabricacion: fechaOpcional(),
  observaciones: textoOpcional(500),
});

export type ArticuloSolicitado = z.infer<typeof esquemaArticulo>;
export type ConversionesSolicitadas = z.infer<typeof esquemaConversiones>;
export type LoteSolicitado = z.infer<typeof esquemaLote>;
export type ParamsArticulo = z.infer<typeof esquemaParamsArticulo>;
