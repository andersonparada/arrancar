import type { Operador } from '../../../core/compartido/aplicacion/operador.js';

/** Los datos de la empresa que encabezan la contraseña impresa. */
export interface EmpresaDeLaImpresion {
  nombre: string;
  nit: string | null;
  razonSocial: string | null;
  nombreComercial: string | null;
}

/** De dónde salen los datos de la empresa activa (el módulo Empresas, por el mediador). */
export interface DatosDeLaEmpresa {
  obtener(operador: Operador): Promise<EmpresaDeLaImpresion>;
}

/** El texto al pie de la contraseña impresa según la configuración de la empresa; vacío si no se imprime. */
export interface LeyendaDeContrasenas {
  texto(operador: Operador): Promise<string>;
}
