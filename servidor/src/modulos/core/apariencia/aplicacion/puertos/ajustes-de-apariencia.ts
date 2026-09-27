export interface AjustesGuardados {
  nombreAplicacion: string;
  colorPrincipal: string;
  colorAcento: string;
  versionLogo: string | null;
}

export type AjusteDeApariencia = keyof AjustesGuardados;

/** Dónde se guardan los ajustes de apariencia de la instalación (hoy, en la configuración). */
export interface AjustesDeApariencia {
  leer(): Promise<AjustesGuardados>;
  guardar(cambios: Partial<AjustesGuardados>, usuarioId: string): Promise<void>;
  /** Vuelven al valor de Arrancar o al del archivo de instalación. */
  restablecer(ajustes: readonly AjusteDeApariencia[]): Promise<void>;
}
