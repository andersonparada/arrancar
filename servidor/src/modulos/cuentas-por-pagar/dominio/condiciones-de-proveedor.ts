/** Los días de crédito más largos que se pueden pactar con un proveedor. */
export const DIAS_MAXIMOS_DE_CREDITO = 365;

/** Cómo le paga la empresa a un proveedor: lo que decide cuándo vencen sus cargos. */
export interface CondicionesDeProveedor {
  /** `null` es el plazo por omisión de la empresa (un mes) y `0`, contado. */
  diasDeCredito: number | null;
  /** El plazo corre desde la fecha de recepción del documento; por omisión, desde la de emisión. */
  contarDesdeLaRecepcion: boolean;
}

/** Lo que vale para un proveedor que nunca guardó sus condiciones. */
export const CONDICIONES_POR_OMISION: CondicionesDeProveedor = { diasDeCredito: null, contarDesdeLaRecepcion: false };

/** Lo que cambia un formulario de Proveedores: lo que no trae se queda como estaba. */
export type CambioDeCondiciones = Partial<CondicionesDeProveedor>;
