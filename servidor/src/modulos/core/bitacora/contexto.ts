import { bd } from '../base-datos/conexion.js';
import { ListarBitacoraReciente } from './aplicacion/casos-uso/listar-bitacora-reciente.js';
import { RegistrarEntradaDeSoporte } from './aplicacion/casos-uso/registrar-entrada-de-soporte.js';
import { BitacoraControlador } from './http/bitacora.controlador.js';
import { rutasBitacora } from './http/bitacora.rutas.js';
import { BitacoraDrizzle } from './infraestructura/persistencia/bitacora.drizzle.js';

const bitacora = new BitacoraDrizzle(bd);

/** Lo usa la sesión cuando soporte cambia de empresa. */
export const registrarEntradaDeSoporte = new RegistrarEntradaDeSoporte({ bitacora });

/** Raíz de composición del contexto de bitácora. */
export function componerBitacora() {
  const controlador = new BitacoraControlador({ listarReciente: new ListarBitacoraReciente({ bitacora }) });
  return rutasBitacora(controlador);
}
