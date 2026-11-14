/** Lo que suman los saldos iniciales vigentes de un proveedor, en centavos. */
export interface SumasDeProveedorEnElCuadre {
  proveedorId: string;
  proveedorNombre: string;
  proveedorNit: string | null;
  documentos: number;
  cargosCentavos: number;
  notasAFavorCentavos: number;
  retencionesPorPracticarCentavos: number;
}

/** La consulta del cuadre de los saldos iniciales de la empresa activa. */
export interface ConsultasDeCuadre {
  /** Una fila por proveedor con saldos iniciales vigentes, por nombre. */
  sumasPorProveedor(): Promise<SumasDeProveedorEnElCuadre[]>;
  /** Cuántos saldos iniciales vigentes de cada proveedor tienen notas posteriores libres que citan su factura, por id de proveedor. */
  saldosConNotasPosteriores(): Promise<Map<string, number>>;
}
