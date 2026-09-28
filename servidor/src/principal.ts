import { construirAplicacion } from './aplicacion.js';
import { configuracion } from './configuracion.js';
import { grupoConexiones } from './modulos/core/base-datos/conexion.js';
import { depurarAuditoria } from './modulos/core/bitacora/contexto.js';
import { limpiarSesionesVencidas } from './modulos/core/identidad/contexto.js';

const UNA_HORA = 60 * 60 * 1000;
const UN_DIA = 24 * UNA_HORA;

const app = await construirAplicacion();

const limpiezaSesiones = setInterval(() => {
  limpiarSesionesVencidas.ejecutar().catch((error: unknown) => app.log.error(error, 'Limpieza de sesiones'));
}, UNA_HORA);

const depurar = () =>
  depurarAuditoria.ejecutar().catch((error: unknown) => app.log.error(error, 'Depuración de la auditoría'));
const depuracionDiaria = setInterval(depurar, UN_DIA);
void depurar();

async function detener(senal: string): Promise<void> {
  app.log.info(`Recibida ${senal}, cerrando…`);
  clearInterval(limpiezaSesiones);
  clearInterval(depuracionDiaria);
  await app.close();
  await grupoConexiones.end();
  process.exit(0);
}

process.on('SIGINT', () => void detener('SIGINT'));
process.on('SIGTERM', () => void detener('SIGTERM'));

await app.listen({ port: configuracion.PUERTO, host: '0.0.0.0' });
