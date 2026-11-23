import { z } from 'zod';
import {
  decimalObligatorio,
  decimalOpcional,
  fechaObligatoria,
  idObligatorio,
  idOpcional,
  opcionObligatoria,
  opcionOpcional,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { CAUSAS_DE_ANULACION } from '../dominio/baja-de-documento.js';
import { CLASES_FISCALES } from '../dominio/calculo-de-lineas.js';
import { DESTINOS_DE_DOCUMENTO } from '../dominio/destino-del-documento.js';
import { TIPOS_DE_IDENTIFICACION } from '../dominio/receptor.js';
import { TIPOS_DE_DOCUMENTO, TIPOS_DTE } from '../dominio/tipos-de-documento.js';

const MAXIMO_DE_LINEAS = 200;
const LIMITE_POR_OMISION = 50;
const LIMITE_MAXIMO = 200;

const esquemaLinea = z.object({
  conceptoDeIngresoId: idObligatorio(),
  tipo: opcionOpcional(['bien', 'servicio']),
  claseFiscal: opcionOpcional(CLASES_FISCALES),
  descripcion: textoOpcional(300),
  total: decimalObligatorio(2),
  otrosImpuestos: decimalOpcional(2),
});

/** La factura del sistema anterior que corrige una nota: número y fecha van juntos. */
const esquemaFacturaAnterior = z
  .object({ serie: textoOpcional(40), numero: textoObligatorio(40), fecha: fechaObligatoria() })
  .nullish()
  .transform((valor) => valor ?? null);

/** El destino pedido: uno, ninguno o que lo decida el sistema (sin dato). */
const esquemaDestino = z
  .enum([...DESTINOS_DE_DOCUMENTO, 'ninguno'])
  .nullish()
  .transform((valor) => valor ?? undefined);

/**
 * Forma de lo que llega al registrar un documento: el dinero viaja como texto y nada viene calculado. Las reglas
 * fiscales las revisa el dominio.
 */
export const esquemaDocumento = z.object({
  /** Familia fiscal; opcional si llega `tipoDte`, y entonces debe coincidir con él. */
  tipo: opcionOpcional(TIPOS_DE_DOCUMENTO),
  /** Código de la SAT del documento; obligatorio si tiene FEL. */
  tipoDte: opcionOpcional(TIPOS_DTE),
  clienteId: idOpcional(),
  tipoDeIdentificacion: opcionOpcional(TIPOS_DE_IDENTIFICACION),
  nitReceptor: textoOpcional(30),
  nombreReceptor: textoOpcional(200),
  serie: textoOpcional(40),
  numero: textoObligatorio(40),
  autorizacionFel: idOpcional(),
  localidadId: idOpcional(),
  fechaEmision: fechaObligatoria(),
  documentoAfectadoId: idOpcional(),
  facturaAnterior: esquemaFacturaAnterior,
  destino: esquemaDestino,
  ivaDelDte: decimalOpcional(2),
  observaciones: textoOpcional(500),
  lineas: z.array(esquemaLinea).min(1).max(MAXIMO_DE_LINEAS),
});

export const esquemaParamsDeDocumento = z.object({ documentoId: z.uuid() });

/**
 * Filtros y página de la lista. `periodo` es cualquier fecha del mes del libro; `estado` es `vigente` por omisión
 * (oculta los anulados), `anulado` o `todos`; `pagina` empieza en 1 y `limite` es de 50 por omisión (máximo 200).
 */
export const esquemaFiltroDeDocumentos = z.object({
  periodo: z.iso.date().optional(),
  clienteId: z.uuid().optional(),
  tipo: opcionObligatoria(TIPOS_DE_DOCUMENTO).optional(),
  estado: z.enum(['vigente', 'anulado', 'todos']).default('vigente'),
  destino: z.enum([...DESTINOS_DE_DOCUMENTO, 'ninguno']).optional(),
  texto: z.string().trim().max(100).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

/** Anular exige la causa (de una lista) y el motivo; el dominio revisa que el motivo no pase de 300 caracteres. */
export const esquemaAnulacionDeDocumento = z.object({
  causa: z.enum(CAUSAS_DE_ANULACION),
  motivo: z.string().trim().min(1, 'Campo obligatorio.'),
  /** La fecha en que la SAT anuló el DTE; sin dato, hoy. */
  fechaDeAnulacion: z.iso.date().nullish(),
});

export type DocumentoSolicitado = z.output<typeof esquemaDocumento>;
export type ParamsDeDocumento = z.infer<typeof esquemaParamsDeDocumento>;
export type FiltroDeDocumentosSolicitado = z.output<typeof esquemaFiltroDeDocumentos>;
export type AnulacionDeDocumentoSolicitada = z.infer<typeof esquemaAnulacionDeDocumento>;
