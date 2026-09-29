/** Razón social y nombre comercial de una empresa; vacíos mientras nadie los haya guardado. */
export interface DatosFiscalesDto {
  empresaId: string;
  razonSocial: string | null;
  nombreComercial: string | null;
}

/** Lo que se recibe para guardar los datos fiscales, ya validado en su forma. */
export interface SolicitudDeDatosFiscales {
  razonSocial: string | null;
  nombreComercial: string | null;
}

/** Fecha de inicio de la empresa y estado de su carga inicial; sin fecha mientras nadie la haya registrado. */
export interface CargaInicialDto {
  empresaId: string;
  /** `aaaa-mm-dd`. */
  fechaDeInicio: string | null;
  cerrada: boolean;
  cerradaEn: Date | null;
  /** Nombre de quien la cerró. */
  cerradaPor: string | null;
}

/** Lo que responde la orden `empresas.obtener_datos_de_empresa`. */
export interface DatosDeIdentificacionDto {
  nombre: string;
  nit: string | null;
  razonSocial: string | null;
  nombreComercial: string | null;
}
