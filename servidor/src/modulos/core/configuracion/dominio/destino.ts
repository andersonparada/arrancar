/** A quién aplica la configuración. Sin cuenta, solo cuentan los valores de la instalación. */
export interface DestinoConfiguracion {
  cuentaId: string | null;
  empresaId: string | null;
}

export const DESTINO_INSTALACION: DestinoConfiguracion = { cuentaId: null, empresaId: null };
