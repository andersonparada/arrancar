import { almacenamiento } from '../compartido/infraestructura/almacenamiento-local.js';
import { AbrirLogo } from './aplicacion/casos-uso/abrir-logo.js';
import { CambiarApariencia } from './aplicacion/casos-uso/cambiar-apariencia.js';
import { CambiarLogo } from './aplicacion/casos-uso/cambiar-logo.js';
import { ObtenerApariencia } from './aplicacion/casos-uso/obtener-apariencia.js';
import { QuitarLogo } from './aplicacion/casos-uso/quitar-logo.js';
import { RestablecerApariencia } from './aplicacion/casos-uso/restablecer-apariencia.js';
import { AparienciaControlador } from './http/apariencia.controlador.js';
import { rutasApariencia } from './http/apariencia.rutas.js';
import { AjustesEnConfiguracion } from './infraestructura/ajustes-en-configuracion.js';
import { ConvertidorDeLogoSharp } from './infraestructura/convertidor-de-logo-sharp.js';

/**
 * Raíz de composición del contexto de apariencia. No usa la unidad de trabajo:
 * sus ajustes son de la instalación, no de una cuenta o empresa.
 */
export function componerApariencia() {
  const ajustes = new AjustesEnConfiguracion();
  const controlador = new AparienciaControlador({
    obtener: new ObtenerApariencia({ ajustes }),
    cambiar: new CambiarApariencia({ ajustes }),
    restablecer: new RestablecerApariencia({ ajustes }),
    abrirLogo: new AbrirLogo({ almacenamiento }),
    cambiarLogo: new CambiarLogo({ ajustes, almacenamiento, convertidor: new ConvertidorDeLogoSharp() }),
    quitarLogo: new QuitarLogo({ ajustes, almacenamiento }),
  });
  return rutasApariencia(controlador);
}
