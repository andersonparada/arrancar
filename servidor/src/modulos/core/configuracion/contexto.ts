import { bd } from '../base-datos/conexion.js';
import { EstablecerValor } from './aplicacion/casos-uso/establecer-valor.js';
import { ListarVariablesEditables } from './aplicacion/casos-uso/listar-variables-editables.js';
import { RestablecerValor } from './aplicacion/casos-uso/restablecer-valor.js';
import { LectorDeConfiguracion } from './aplicacion/lector-de-configuracion.js';
import { ConfiguracionControlador } from './http/configuracion.controlador.js';
import { rutasConfiguracion } from './http/configuracion.rutas.js';
import { archivoDeInstalacion } from './infraestructura/archivo-de-instalacion.js';
import { CatalogoEnRegistro } from './infraestructura/catalogo-en-registro.js';
import { RepositorioConfiguracionesDrizzle } from './infraestructura/persistencia/repositorio-configuraciones.drizzle.js';

/** Raíz de composición del contexto; la sesión y apariencia también leen y cambian valores con estas piezas. */
function crearConfiguracion() {
  const repositorio = new RepositorioConfiguracionesDrizzle(bd);
  const catalogo = new CatalogoEnRegistro();
  return {
    lector: new LectorDeConfiguracion({ repositorio, catalogo, instalacion: archivoDeInstalacion }),
    establecer: new EstablecerValor({ repositorio, catalogo }),
    restablecer: new RestablecerValor({ repositorio, catalogo }),
  };
}

export const configuracion = crearConfiguracion();

export type PiezasDeConfiguracion = typeof configuracion;

export function componerConfiguracion() {
  const { lector, establecer, restablecer } = configuracion;
  const controlador = new ConfiguracionControlador({
    listar: new ListarVariablesEditables({ lector }),
    establecer,
    restablecer,
  });
  return rutasConfiguracion(controlador);
}
