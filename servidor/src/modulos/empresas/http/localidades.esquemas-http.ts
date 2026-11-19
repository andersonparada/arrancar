import { z } from 'zod';
import {
  codigoGeografico,
  enteroOpcional,
  idObligatorio,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar una localidad; las reglas de negocio las revisa el dominio. */
export const esquemaLocalidad = z.object({
  codigo: textoObligatorio(12),
  nombre: textoObligatorio(120),
  tipoId: idObligatorio(),
  codigoEstablecimientoSat: enteroOpcional(),
  nombreComercialSat: textoOpcional(200),
  departamentoCodigo: codigoGeografico,
  municipioCodigo: codigoGeografico,
  direccion: textoOpcional(300),
  activo: z.boolean().default(true),
});

export const esquemaParamsLocalidad = z.object({ localidadId: z.uuid() });

export type LocalidadSolicitado = z.infer<typeof esquemaLocalidad>;
export type ParamsLocalidad = z.infer<typeof esquemaParamsLocalidad>;
