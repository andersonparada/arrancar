import type { ConfiguracionDeVales, ConsultasDeVales, RepositorioDeVales } from '../../puertos/puertos-de-vales.js';
import type { CustodiosDeFondos } from '../../puertos/puertos-de-fondos.js';
import type { DependenciasDeComprobantes } from '../comprobantes/dependencias-de-comprobantes.js';

/** Lo que necesitan los casos de uso de los vales provisionales: lo de los comprobantes y lo propio de los vales. */
export interface DependenciasDeVales extends DependenciasDeComprobantes {
  vales: RepositorioDeVales;
  consultasDeVales: ConsultasDeVales;
  configuracionDeVales: ConfiguracionDeVales;
  /** Para dar el nombre del usuario al que se entrega el vale. */
  usuarios: CustodiosDeFondos;
}
