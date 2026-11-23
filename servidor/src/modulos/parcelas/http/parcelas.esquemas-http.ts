import { z } from 'zod';
import {
  decimalOpcional,
  fechaOpcional,
  idObligatorio,
  idOpcional,
  opcionObligatoria,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { FORMAS_DE_TENENCIA } from '../dominio/datos-de-parcela.js';
import { esquemaMedicion } from './mediciones.esquemas-http.js';

const ligaConInmueble = z.object({ inmuebleId: idObligatorio(), superficieM2: decimalOpcional(2) });

/** Lo que se puede cambiar de una parcela ya creada. */
export const esquemaCambioDeParcela = z.object({
  tipoId: idObligatorio(),
  nombre: textoObligatorio(120),
  formaDeTenencia: opcionObligatoria(FORMAS_DE_TENENCIA),
  latitud: decimalOpcional(6),
  longitud: decimalOpcional(6),
  colindanciaNorte: textoOpcional(300),
  colindanciaSur: textoOpcional(300),
  colindanciaOriente: textoOpcional(300),
  colindanciaPoniente: textoOpcional(300),
  observaciones: textoOpcional(500),
  inmuebles: z
    .array(ligaConInmueble)
    .max(50)
    .refine((ligas) => new Set(ligas.map(({ inmuebleId }) => inmuebleId)).size === ligas.length, {
      message: 'Un inmueble no puede repetirse en la misma parcela.',
    })
    .default([]),
});

/** Lo que llega al crear una parcela: lo editable, dónde va y, si ya se conoce, su primera medición. */
export const esquemaParcela = esquemaCambioDeParcela.extend({
  localidadId: idObligatorio(),
  parcelaMadreId: idOpcional(),
  codigo: textoObligatorio(20),
  medicion: esquemaMedicion.nullish().transform((medicion) => medicion ?? null),
});

/** Al inactivar se puede decir desde qué día; por omisión, hoy. */
export const esquemaInactivacionDeParcela = z.object({ fecha: fechaOpcional() }).default({ fecha: null });

/** Los filtros de la lista; `arbol=true` devuelve las parcelas armadas como árbol. */
export const esquemaFiltrosDeParcelas = z.object({
  localidadId: z.uuid().optional(),
  parcelaMadreId: z.uuid().optional(),
  tipoId: z.uuid().optional(),
  formaDeTenencia: z.enum(FORMAS_DE_TENENCIA).optional(),
  soloActivas: z.enum(['true', 'false']).optional(),
  texto: z.string().trim().max(60).optional(),
  arbol: z.enum(['true', 'false']).optional(),
});

export const esquemaParamsParcela = z.object({ parcelaId: z.uuid() });

export type ParcelaSolicitada = z.infer<typeof esquemaParcela>;
export type CambioDeParcelaSolicitado = z.infer<typeof esquemaCambioDeParcela>;
export type InactivacionDeParcelaSolicitada = z.infer<typeof esquemaInactivacionDeParcela>;
export type FiltrosDeParcelasSolicitados = z.infer<typeof esquemaFiltrosDeParcelas>;
export type ParamsParcela = z.infer<typeof esquemaParamsParcela>;
