import { AjusteDelControlEnConfiguracion } from '../infraestructura/ajuste-del-control-en-configuracion.js';
import { ControlDePeriodosEnBaseDeDatos } from '../infraestructura/persistencia/control-de-periodos.drizzle.js';

/** El control de períodos declarados con su bloqueo leído de la configuración de la empresa. */
export const controlDePeriodos = () => new ControlDePeriodosEnBaseDeDatos(new AjusteDelControlEnConfiguracion());
