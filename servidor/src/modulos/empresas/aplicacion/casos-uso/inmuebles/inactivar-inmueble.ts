import { CambiarEstadoDeInmueble } from './cambiar-estado-de-inmueble.js';

export class InactivarInmueble extends CambiarEstadoDeInmueble {
  protected readonly activoDespues = false;
}
