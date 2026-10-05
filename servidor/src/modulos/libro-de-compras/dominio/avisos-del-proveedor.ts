import type { DatosFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import type { DatosFiscalesDeProveedor } from './datos-fiscales-de-proveedor.js';

export const AVISO_DE_PROVEEDOR_SIN_DATOS_FISCALES =
  'El proveedor no tiene datos fiscales guardados: se usaron los valores por omisión (régimen sobre utilidades, sin pequeño contribuyente ni agente de retención). Complételos para que las retenciones sean correctas.';

export const AVISO_DE_PROVEEDOR_NO_DOMICILIADO =
  'El proveedor no está domiciliado en el país: revise la retención con su contador.';

export interface DatosParaAvisosDelProveedor {
  empresa: DatosFiscalesDeEmpresa;
  proveedor: DatosFiscalesDeProveedor;
  /** `true` si no hay fila guardada y se usaron los valores por omisión. */
  proveedorSinDatosFiscales: boolean;
}

const retieneAlgo = (empresa: DatosFiscalesDeEmpresa): boolean => {
  const { agenteDeRetencionIva, esAgenteDeRetencionIsr } = empresa.instantanea();
  return agenteDeRetencionIva !== 'ninguno' || esAgenteDeRetencionIsr;
};

/**
 * Avisos que no bloquean sobre los datos fiscales del proveedor: sin datos guardados, si la empresa es agente de
 * retención, las retenciones salen de los valores por omisión; y a un no domiciliado conviene revisarle la
 * retención con el contador.
 */
export function avisosDelProveedor(datos: DatosParaAvisosDelProveedor): string[] {
  const avisos: string[] = [];
  if (datos.proveedorSinDatosFiscales && retieneAlgo(datos.empresa)) {
    avisos.push(AVISO_DE_PROVEEDOR_SIN_DATOS_FISCALES);
  }
  if (datos.proveedor.instantanea().regimenIsr === 'no_domiciliado') avisos.push(AVISO_DE_PROVEEDOR_NO_DOMICILIADO);
  return avisos;
}
