import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { CargaInicial, DatosDeFiscales, DatosFiscales } from '../servicios/datos-de-empresa.api';

/** Lo que el formulario de la empresa escribe además de sus datos generales. */
export interface CamposDeDatosDeEmpresa {
  razonSocial: string;
  nombreComercial: string;
  fechaDeInicio: string;
}

export const DATOS_DE_EMPRESA_VACIOS: CamposDeDatosDeEmpresa = {
  razonSocial: '',
  nombreComercial: '',
  fechaDeInicio: '',
};

/** Los campos tal como están guardados en el servidor. */
export const camposGuardados = (fiscales: DatosFiscales, carga: CargaInicial): CamposDeDatosDeEmpresa => ({
  razonSocial: fiscales.razonSocial ?? '',
  nombreComercial: fiscales.nombreComercial ?? '',
  fechaDeInicio: carga.fechaDeInicio ?? '',
});

/** Los datos fiscales que hay que guardar, o `null` si no cambiaron. */
export function fiscalesPorGuardar(
  actual: CamposDeDatosDeEmpresa,
  guardado: CamposDeDatosDeEmpresa,
): DatosDeFiscales | null {
  const sinCambio = actual.razonSocial === guardado.razonSocial && actual.nombreComercial === guardado.nombreComercial;
  if (sinCambio) return null;
  return { razonSocial: actual.razonSocial.trim() || null, nombreComercial: actual.nombreComercial.trim() || null };
}

/** La fecha de inicio que hay que guardar: solo si cambió, no está vacía y la carga sigue abierta. */
export function fechaPorGuardar(
  actual: CamposDeDatosDeEmpresa,
  guardado: CamposDeDatosDeEmpresa,
  cargaCerrada: boolean,
): string | null {
  if (cargaCerrada || !actual.fechaDeInicio) return null;
  return actual.fechaDeInicio === guardado.fechaDeInicio ? null : actual.fechaDeInicio;
}

/** Se puede cerrar con la fecha ya guardada y sin cambios pendientes en ella. */
export function puedeCerrarLaCarga(actual: CamposDeDatosDeEmpresa, carga: CargaInicial | null): boolean {
  return Boolean(carga?.fechaDeInicio) && !carga?.cerrada && actual.fechaDeInicio === carga?.fechaDeInicio;
}

export const AYUDA_DE_FECHA_DE_INICIO =
  'Primer día que se registra en Arrancar; los saldos iniciales son los del cierre del día anterior. Se puede corregir mientras la carga inicial esté abierta.';

const AVISO_DE_FECHA_QUE_NO_ES_DIA_UNO =
  'Se recomienda el día 1 de un mes (mejor el 1 de enero, inicio del período del ISR): partir un mes entre dos sistemas obliga a armar a mano el libro de compras y la declaración de ese mes.';

/** Aviso (que no bloquea) si la fecha escrita no es día 1 de un mes; `null` si es día 1 o no hay fecha válida. */
export function avisoDeFechaDeInicio(fecha: string): string | null {
  const partes = /^\d{4}-\d{2}-(\d{2})$/.exec(fecha);
  return partes && partes[1] !== '01' ? AVISO_DE_FECHA_QUE_NO_ES_DIA_UNO : null;
}

/** Recordatorio que se añade a la confirmación de cerrar la carga inicial. */
export const RECORDATORIO_DE_CUADRE =
  'Antes de cerrar, compare el cuadre de los saldos iniciales de cada módulo con el balance de apertura.';

const SALDOS_POSTERIORES = 'saldos_iniciales_posteriores_a_la_fecha';

/**
 * Si el servidor rechaza la fecha porque hay saldos iniciales emitidos desde ella, devuelve el mismo error
 * señalando el campo de la fecha (para marcarlo en el formulario); cualquier otro error pasa igual.
 */
export function errorConCampoDeFecha(error: unknown): unknown {
  if (!(error instanceof ErrorApi) || error.codigo !== SALDOS_POSTERIORES) return error;
  return new ErrorApi(error.estado, {
    codigo: error.codigo,
    mensaje: error.message,
    detalles: { campo: 'fechaDeInicio' },
  });
}

/**
 * Si el guardado falló por una sección de otro módulo (por ejemplo los datos fiscales del libro de compras), el error
 * sale en esa sección, arriba en el formulario; esto lo repite junto a la fecha de inicio para quien edita al final.
 */
export function avisoDeErrorEnSecciones(errores: Record<string, string>): string | null {
  const clave = Object.keys(errores).find((campo) => campo.startsWith('secciones.'));
  return clave ? `No se guardó. Corrija más arriba: ${errores[clave]}` : null;
}
