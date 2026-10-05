import { z } from 'zod';
import {
  decimalObligatorio,
  decimalOpcional,
  fechaObligatoria,
  fechaOpcional,
  idObligatorio,
  idOpcional,
  nitOpcional,
  opcionObligatoria,
  opcionOpcional,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { DESTINOS_DE_DOCUMENTO } from '../dominio/destinos-de-documento.js';
import { MOTIVOS_FUERA_DEL_LIBRO } from '../dominio/fuera-del-libro.js';
import { REGLAS_DE_RETENCION } from '../dominio/retencion-propuesta.js';
import { TIPOS_DE_DOCUMENTO } from '../dominio/tipos-de-documento.js';

const MAXIMO_DE_LINEAS = 200;

const esquemaLinea = z.object({
  conceptoId: idObligatorio(),
  descripcion: textoOpcional(300),
  tipo: opcionOpcional(['bien', 'servicio']),
  esActivoFijo: z
    .boolean()
    .nullish()
    .transform((valor) => valor ?? null),
  combustibleId: idOpcional(),
  galones: decimalOpcional(3),
  total: decimalObligatorio(2),
  exento: decimalOpcional(2),
});

const esquemaAjusteDeRetencion = z.object({
  regla: opcionObligatoria(REGLAS_DE_RETENCION),
  monto: decimalObligatorio(2),
  motivo: textoOpcional(300),
});

/**
 * Forma de lo que llega al calcular o registrar un documento: el montos viaja como texto y nada viene calculado.
 * Las reglas fiscales las revisa el dominio.
 */
export const esquemaDocumento = z.object({
  tipo: opcionObligatoria(TIPOS_DE_DOCUMENTO),
  proveedorId: idObligatorio(),
  destino: opcionObligatoria(DESTINOS_DE_DOCUMENTO),
  nitEmisor: nitOpcional,
  serie: textoOpcional(40),
  numero: textoObligatorio(40),
  autorizacionFel: idOpcional(),
  nitReceptor: nitOpcional,
  motivoFueraDelLibro: opcionOpcional(MOTIVOS_FUERA_DEL_LIBRO),
  noVinculado: z.boolean().default(false),
  fechaEmision: fechaObligatoria(),
  fechaRecepcion: fechaOpcional(),
  periodo: fechaOpcional(),
  documentoAfectadoId: idOpcional(),
  ivaDeLaFel: decimalOpcional(2),
  observaciones: textoOpcional(500),
  lineas: z.array(esquemaLinea).min(1).max(MAXIMO_DE_LINEAS),
  ajustesDeRetenciones: z.array(esquemaAjusteDeRetencion).max(10).default([]),
});

export const esquemaParamsDeProveedor = z.object({ proveedorId: z.uuid() });

export type DocumentoSolicitado = z.output<typeof esquemaDocumento>;
export type ParamsDeProveedorDeDocumento = z.infer<typeof esquemaParamsDeProveedor>;
