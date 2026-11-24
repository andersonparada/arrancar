import { numeroONulo, textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { Activo } from '../../servicios/activos.api';
import type { DatosDeRevisionDeEstimacion, DatosDeValorFiscalDelInmueble } from '../../servicios/mejoras.api';
import { centavosDeTexto } from '../bandeja/montos-de-bandeja';

/** Lo que se escribe al revisar la estimación contable: cuánto le queda de vida y, si cambia, el residual. */
export interface EdicionDeEstimacion {
  vidaUtilRestante: string | number;
  valorResidual: string | number;
  motivo: string;
}

/** Lo que se escribe al cambiar la matrícula o el catastro de un edificio. */
export interface EdicionDeMatricula {
  valorDeMatricula: string | number;
  valorCatastral: string | number;
  valoresDelInmuebleCompleto: boolean;
  motivo: string;
  documentoDeSoporte: string;
}

export const edicionDeEstimacionNueva = (activo: Pick<Activo, 'valorResidual'>): EdicionDeEstimacion => ({
  vidaUtilRestante: '',
  valorResidual: textoDeEdicion(activo.valorResidual),
  motivo: '',
});

/** Parte de los valores que el edificio ya tiene. */
export const edicionDeMatriculaNueva = (
  activo: Pick<Activo, 'valorDeMatricula' | 'valorCatastral' | 'valoresDelInmuebleCompleto'>,
): EdicionDeMatricula => ({
  valorDeMatricula: textoDeEdicion(activo.valorDeMatricula),
  valorCatastral: textoDeEdicion(activo.valorCatastral),
  valoresDelInmuebleCompleto: activo.valoresDelInmuebleCompleto,
  motivo: '',
  documentoDeSoporte: '',
});

const MENSAJE_DE_MOTIVO = 'Escriba el motivo: queda en la auditoría.';

const montoInvalido = (valor: string | number): boolean => {
  const texto = textoONulo(valor);
  if (texto === null) return false;
  const centavos = centavosDeTexto(texto);
  return centavos === null || centavos < 0;
};

/** Lo que falla antes de mandar la revisión de la estimación, por campo y con cómo corregirlo. */
export function erroresDeEstimacion(edicion: EdicionDeEstimacion): Record<string, string> {
  const errores: Record<string, string> = {};
  const vida = numeroONulo(edicion.vidaUtilRestante);
  if (vida === null || !Number.isInteger(vida) || vida < 1 || vida > 1200)
    errores.vidaUtilRestanteMeses = 'Escriba los meses que le quedan al activo, de 1 a 1200.';
  if (montoInvalido(edicion.valorResidual))
    errores.valorResidual = 'Escriba el valor residual con hasta dos decimales, o déjelo como está.';
  if (!edicion.motivo.trim()) errores.motivo = MENSAJE_DE_MOTIVO;
  return errores;
}

/** Lo que se manda al servidor al revisar la estimación. */
export function datosDeEstimacion(edicion: EdicionDeEstimacion): DatosDeRevisionDeEstimacion {
  return {
    vidaUtilRestanteMeses: Number(edicion.vidaUtilRestante),
    valorResidual: textoONulo(edicion.valorResidual),
    motivo: edicion.motivo.trim(),
  };
}

/** Lo que falla antes de mandar el cambio de matrícula o catastro, por campo y con cómo corregirlo. */
export function erroresDeMatricula(edicion: EdicionDeMatricula): Record<string, string> {
  const errores: Record<string, string> = {};
  const sinValores = textoONulo(edicion.valorDeMatricula) === null && textoONulo(edicion.valorCatastral) === null;
  if (sinValores) errores.valorDeMatricula = 'Escriba el valor de matrícula, el catastral o ambos.';
  if (montoInvalido(edicion.valorDeMatricula)) errores.valorDeMatricula = 'Escriba un monto con hasta dos decimales.';
  if (montoInvalido(edicion.valorCatastral)) errores.valorCatastral = 'Escriba un monto con hasta dos decimales.';
  if (!edicion.documentoDeSoporte.trim())
    errores.documentoDeSoporte =
      'Escriba el documento que respalda el cambio (por ejemplo: certificación del Registro).';
  if (!edicion.motivo.trim()) errores.motivo = MENSAJE_DE_MOTIVO;
  return errores;
}

/** Lo que se manda al servidor al cambiar la matrícula o el catastro. */
export function datosDeMatricula(edicion: EdicionDeMatricula): DatosDeValorFiscalDelInmueble {
  return {
    valorDeMatricula: textoONulo(edicion.valorDeMatricula),
    valorCatastral: textoONulo(edicion.valorCatastral),
    valoresDelInmuebleCompleto: edicion.valoresDelInmuebleCompleto,
    motivo: edicion.motivo.trim(),
    documentoDeSoporte: edicion.documentoDeSoporte.trim(),
  };
}
