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
