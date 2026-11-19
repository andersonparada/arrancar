import { z } from 'zod';
import {
  decimalOpcional,
  enteroObligatorio,
  fechaObligatoria,
  idObligatorio,
  idOpcional,
  opcionObligatoria,
  opcionOpcional,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import {
  ESTADOS_DE_ACTIVO,
  FORMAS_DE_TENENCIA,
  ORIGENES_DE_ACTIVO,
  TIPOS_DE_REGISTRO,
} from '../dominio/tipos-de-activo.js';

/** Los datos descriptivos del activo, comunes al alta y a la edición. */
const datosEditables = {
  descripcion: textoObligatorio(200),
  claseId: idObligatorio(),
  activoPadreId: idOpcional(),
  origen: opcionOpcional(ORIGENES_DE_ACTIVO),
  propietario: textoOpcional(150),
  formaDeTenencia: opcionOpcional(FORMAS_DE_TENENCIA),
  fechaDeAdquisicion: fechaObligatoria(),
  valorComoGanadoComun: decimalOpcional(2),
  valorDeMatricula: decimalOpcional(2),
  valorCatastral: decimalOpcional(2),
  valoresDelInmuebleCompleto: z.boolean().default(false),
  marca: textoOpcional(80),
  modelo: textoOpcional(80),
  numeroDeSerie: textoOpcional(80),
  placa: textoOpcional(80),
  cantidad: enteroObligatorio().min(1).default(1),
  observaciones: textoOpcional(500),
};

/** Forma de lo que llega al dar de alta un activo; las reglas de negocio las revisa el dominio. */
export const esquemaActivo = z.object({
  ...datosEditables,
  codigo: textoOpcional(30),
  tipoDeRegistro: opcionObligatoria(TIPOS_DE_REGISTRO),
  localidadId: idOpcional(),
  departamentoId: idOpcional(),
  responsable: textoOpcional(150),
  enBodega: z.boolean().default(false),
});

/** Forma de lo que llega al editar un activo: no cambia el código, el tipo de registro ni la ubicación. */
export const esquemaEdicionDeActivo = z.object(datosEditables);

export const esquemaOcioDeActivo = z.object({
  ocioso: z.boolean(),
  fecha: fechaObligatoria(),
  motivo: textoOpcional(300),
});

export const esquemaParamsActivo = z.object({ activoId: z.uuid() });

const booleanoDeConsulta = z.enum(['true', 'false']).transform((valor) => valor === 'true');

/** Filtros de la lista: llegan en la consulta (`?estado=en_uso&ocioso=true`). */
export const esquemaFiltrosDeActivos = z.object({
  estado: z.enum(ESTADOS_DE_ACTIVO).optional(),
  claseId: idObligatorio().optional(),
  tipoDeRegistro: z.enum(TIPOS_DE_REGISTRO).optional(),
  localidadId: idObligatorio().optional(),
  departamentoId: idObligatorio().optional(),
  responsable: z.string().trim().max(150).optional(),
  texto: z.string().trim().max(100).optional(),
  ocioso: booleanoDeConsulta.optional(),
  enBodega: booleanoDeConsulta.optional(),
});

export type ActivoSolicitado = z.infer<typeof esquemaActivo>;
export type EdicionDeActivoSolicitada = z.infer<typeof esquemaEdicionDeActivo>;
export type OcioDeActivoSolicitado = z.infer<typeof esquemaOcioDeActivo>;
export type ParamsActivo = z.infer<typeof esquemaParamsActivo>;
export type FiltrosDeActivosSolicitados = z.infer<typeof esquemaFiltrosDeActivos>;
