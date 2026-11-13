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
}
