import { bd } from '../base-datos/conexion.js';
import { configuracion } from '../configuracion/contexto.js';
import { DepurarAuditoria } from './aplicacion/casos-uso/depurar-auditoria.js';
import { ListarBitacoraReciente } from './aplicacion/casos-uso/listar-bitacora-reciente.js';
import { RegistrarEntradaDeSoporte } from './aplicacion/casos-uso/registrar-entrada-de-soporte.js';
import { BitacoraControlador } from './http/bitacora.controlador.js';
import { rutasBitacora } from './http/bitacora.rutas.js';
import { BitacoraDrizzle } from './infraestructura/persistencia/bitacora.drizzle.js';
import { DepuradorDeAuditoriaDrizzle } from './infraestructura/persistencia/depurador-de-auditoria.drizzle.js';

const bitacora = new BitacoraDrizzle(bd);

/** Lo usa la sesión cuando soporte cambia de empresa. */
export const registrarEntradaDeSoporte = new RegistrarEntradaDeSoporte({ bitacora });

/** Lo usa el servidor una vez al día. */
export const depurarAuditoria = new DepurarAuditoria({
  depurador: new DepuradorDeAuditoriaDrizzle(bd),
  configuracion: configuracion.lector,
});

/** Raíz de composición del contexto de bitácora. */
export function componerBitacora() {
  const controlador = new BitacoraControlador({ listarReciente: new ListarBitacoraReciente({ bitacora }) });
  return rutasBitacora(controlador);
}
