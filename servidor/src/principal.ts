import { construirAplicacion } from './aplicacion.js';
import { configuracion } from './configuracion.js';
import { grupoConexiones } from './modulos/core/base-datos/conexion.js';
import { sesionesRepositorio } from './modulos/core/repositorios/sesiones.repositorio.js';

const UNA_HORA = 60 * 60 * 1000;

const app = await construirAplicacion();

const limpiezaSesiones = setInterval(() => {
  sesionesRepositorio.eliminarVencidas().catch((error: unknown) => app.log.error(error, 'Limpieza de sesiones'));
}, UNA_HORA);

async function detener(senal: string): Promise<void> {
  app.log.info(`Recibida ${senal}, cerrando…`);
  clearInterval(limpiezaSesiones);
  await app.close();
  await grupoConexiones.end();
  process.exit(0);
}

process.on('SIGINT', () => void detener('SIGINT'));
process.on('SIGTERM', () => void detener('SIGTERM'));

await app.listen({ port: configuracion.PUERTO, host: '0.0.0.0' });
