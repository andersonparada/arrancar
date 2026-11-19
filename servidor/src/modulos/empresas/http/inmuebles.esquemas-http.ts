import { z } from 'zod';
import {
  codigoGeografico,
  decimalOpcional,
  enteroOpcional,
  idOpcional,
  opcionObligatoria,
  opcionOpcional,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar un inmueble; las reglas de negocio las revisa el dominio. */
export const esquemaInmueble = z.object({
  nombre: textoObligatorio(120),
  situacionRegistral: opcionObligatoria(['inscrito', 'posesorio']),
  registro: opcionOpcional(['general', 'segundo']),
  numeroDeFinca: textoOpcional(20),
  folio: textoOpcional(20),
  libro: textoOpcional(20),
  departamentoRegistral: codigoGeografico,
  documentoPosesorio: textoOpcional(300),
  titulacionSupletoriaEnTramite: z.boolean().default(false),
  titularidad: opcionObligatoria(['propia', 'copropiedad', 'de_tercero']),
  porcentajeDeCopropiedad: decimalOpcional(2),
  titular: textoOpcional(150),
  matriculaFiscal: textoOpcional(30),
  administraIusi: opcionOpcional(['dicabi', 'municipalidad']),
  codigoCatastral: textoOpcional(40),
  departamentoCodigo: codigoGeografico,
  municipioCodigo: codigoGeografico,
  direccion: textoOpcional(300),
  superficieRegistralM2: decimalOpcional(2),
  cantidadOriginal: decimalOpcional(4),
  unidadOriginal: opcionOpcional(['m2', 'hectarea', 'manzana', 'cuerda', 'vara_cuadrada', 'caballeria']),
  varasPorLadoDeCuerda: enteroOpcional(),
  localidadId: idOpcional(),
  observaciones: textoOpcional(500),
});

export const esquemaParamsInmueble = z.object({ inmuebleId: z.uuid() });

export type InmuebleSolicitado = z.infer<typeof esquemaInmueble>;
export type ParamsInmueble = z.infer<typeof esquemaParamsInmueble>;
