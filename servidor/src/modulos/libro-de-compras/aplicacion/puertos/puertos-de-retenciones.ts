import type { ConstanciaAnotada } from '../../dominio/retenciones/constancia-de-retencion.js';
import type { DatosDelEntero } from '../../dominio/retenciones/entero-de-retenciones.js';
import type { ResolucionDeRetencion } from '../../dominio/retenciones/resolucion-de-retencion.js';
import type { EnteroGuardado, RetencionDelReporte } from '../../dominio/retenciones/retencion-del-reporte.js';
import type { ReglaDeRetencion } from '../../dominio/retencion-propuesta.js';

/** Las consultas de retenciones; corren en la transacción de la empresa activa (RLS). */
export interface ConsultasDeRetenciones {
  /** Las retenciones cuya fecha cae en el mes (primer día), también las de monto cero y las de documentos anulados. */
  delMes(mes: string): Promise<RetencionDelReporte[]>;
  /** Las retenciones puestas en «por resolver» alguna vez: `pendiente`, o ya resueltas. */
  porResolver(estado: 'pendiente' | 'resueltas'): Promise<RetencionDelReporte[]>;
  /** Con `bloquear`, la fila queda bloqueada hasta el fin de la transacción. */
  buscar(id: string, bloquear: boolean): Promise<RetencionDelReporte | null>;
  /** Las retenciones pedidas y bloqueadas, en cualquier orden; las que no existen no vienen. */
  buscarVarias(ids: readonly string[]): Promise<RetencionDelReporte[]>;
  /** Los proveedores que ya tienen anotado alguno de estos números de constancia. */
  proveedoresConConstancia(numeros: readonly string[]): Promise<Array<{ numero: string; proveedorId: string }>>;
}

export interface CambioDeResolucion {
  resolucion: ResolucionDeRetencion;
  nota: string | null;
  resueltaPor: string;
}

/** Cambia constancias y resoluciones de retenciones ya guardadas; las retenciones se crean con su documento. */
export interface RepositorioDeRetenciones {
  /** Anota la constancia o, con `null`, la quita. */
  anotarConstancia(id: string, constancia: ConstanciaAnotada | null): Promise<void>;
  resolver(id: string, cambio: CambioDeResolucion): Promise<void>;
}

/** Lo que una retención del documento deja saber a quien lo anula o lo elimina. */
export interface RetencionPracticada {
  regla: ReglaDeRetencion;
  fecha: string;
  monto: number;
  conConstancia: boolean;
}

/** Lo que Anular y Eliminar documento necesitan de sus retenciones. */
export interface RetencionesDeUnDocumento {
  /** Las retenciones con monto mayor que cero. */
  practicadas(documentoId: string): Promise<RetencionPracticada[]>;
  /** Pone `pendiente` en las practicadas del documento; devuelve cuántas. */
  dejarPorResolver(documentoId: string): Promise<number>;
}

/** Los pagos (enteros) guardados. */
export interface ConsultasDeEnteros {
  /** Los pagos de los meses entre `desde` y `hasta` (primeros días, ambos incluidos), anulados también. */
  delRango(desde: string, hasta: string): Promise<EnteroGuardado[]>;
  buscar(id: string, bloquear: boolean): Promise<EnteroGuardado | null>;
  /** Lo retenido por regla en cada mes del rango (documentos vigentes, monto mayor que cero), en centavos. */
  retenidoDelRango(
    desde: string,
    hasta: string,
  ): Promise<Array<{ mes: string; regla: ReglaDeRetencion; monto: number }>>;
}

export interface RepositorioDeEnteros {
  crear(empresaId: string, datos: DatosDelEntero & { retenidoAlMarcar: number }): Promise<string>;
  /** Cambia lo que se escribió; el mes y el grupo no cambian (para eso se anula y se registra otro). */
  corregir(
    id: string,
    datos: Pick<DatosDelEntero, 'fechaDePago' | 'documentoDePago' | 'monto' | 'observaciones'>,
  ): Promise<void>;
  anular(id: string, anulacion: { anuladoPor: string; motivo: string }): Promise<void>;
}
