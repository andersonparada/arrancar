import type { DatosDeFacturaAnterior, FacturaAnterior } from '../../dominio/factura-anterior.js';

/** Cómo se busca una factura anterior: primero por su autorización FEL, si la hay; si no, por serie y número. */
export interface ClaveDeFacturaAnterior {
  proveedorId: string;
  serie: string | null;
  numero: string;
  autorizacionFel: string | null;
}

/** Lo que ya corrigieron las notas vigentes de una factura anterior. Montos en centavos. */
export interface NotasDeLaFacturaAnterior {
  /** Cuántas notas vigentes la citan. */
  vigentes: number;
  totalDeNotasDeCredito: number;
  ivaDeNotasDeCredito: number;
  totalDeNotasDeDebito: number;
  ivaDeNotasDeDebito: number;
}

export interface FacturaAnteriorConNotas extends FacturaAnterior {
  notas: NotasDeLaFacturaAnterior;
}

/** Una nota que cita una factura anterior; sirve para decir cuál estorba. */
export interface NotaQueCitaLaFactura {
  id: string;
  serie: string | null;
  numero: string;
}

/** Las facturas del sistema anterior que citan las notas; RLS limita todo a la empresa de la transacción. */
export interface RepositorioDeFacturasAnteriores {
  /** La factura con esa clave (con la FEL primero); con `bloquear` la fila queda bloqueada hasta el fin de la transacción. */
  buscar(clave: ClaveDeFacturaAnterior, bloquear: boolean): Promise<FacturaAnteriorConNotas | null>;
  /** La factura por su id (con las notas vigentes que la citan); con `bloquear`, la fila queda bloqueada. */
  buscarPorId(id: string, bloquear: boolean): Promise<FacturaAnteriorConNotas | null>;
  /** Todas las facturas anteriores que citan las notas de ese proveedor (con la fecha más reciente primero). */
  citadasPorElProveedor(proveedorId: string): Promise<FacturaAnterior[]>;
  /** Una factura vigente del libro de la empresa con esa serie y número (familia factura) o esa autorización FEL. */
  buscarFacturaDelLibro(clave: ClaveDeFacturaAnterior): Promise<{ id: string } | null>;
  /** Una nota vigente que cita como anterior una factura con esa clave; `null` si ninguna. */
  buscarNotaVigenteQueLaCita(clave: ClaveDeFacturaAnterior): Promise<NotaQueCitaLaFactura | null>;
  /** @throws FacturaAnteriorRegistradaPorOtraPersona si otra transacción la creó en este instante. */
  agregar(empresaId: string, factura: FacturaAnterior): Promise<void>;
  /** Borra la factura si ya ninguna nota (ni vigente ni anulada) la cita; devuelve si la borró. */
  borrarSiNoTieneNotas(id: string): Promise<boolean>;
  /** Cambia sus datos (solo con notas anuladas). */
  corregir(factura: FacturaAnterior): Promise<void>;
}

/** Los DTE de factura de la bandeja que podrían ser facturas del sistema anterior (para llenar el formulario con un clic). */
export interface DteAnterioresParaSugerir {
  /**
   * Los DTE de familias de factura que admiten notas, emitidos antes de la fecha de inicio, del proveedor (por su
   * asignación o por su NIT), vigentes en la SAT y que no se registraron en el libro; los más recientes primero.
   */
  deFactura(consulta: {
    proveedorId: string;
    nit: string | null;
    fechaDeInicio: string;
  }): Promise<DatosDeFacturaAnterior[]>;
}
