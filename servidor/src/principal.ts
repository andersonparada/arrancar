import { construirAplicacion } from './aplicacion.js';
import { configuracion, esProduccion } from './configuracion.js';
import { grupoConexiones } from './modulos/core/base-datos/conexion.js';
import { crearDepuradorDeArchivosHuerfanos } from './modulos/core/archivos/contexto.js';
import { verificarQpdf } from './modulos/core/archivos/infraestructura/qpdf/verificador-de-qpdf.js';
import { depurarAuditoria } from './modulos/core/bitacora/contexto.js';
import { limpiarSesionesVencidas } from './modulos/core/identidad/contexto.js';

const UNA_HORA = 60 * 60 * 1000;
const UN_DIA = 24 * UNA_HORA;

const app = await construirAplicacion();
await revisarQpdf();

const limpiezaSesiones = setInterval(() => {
  limpiarSesionesVencidas.ejecutar().catch((error: unknown) => app.log.error(error, 'Limpieza de sesiones'));
}, UNA_HORA);

const depurar = () =>
  depurarAuditoria.ejecutar().catch((error: unknown) => app.log.error(error, 'Depuración de la auditoría'));
const depuracionDiaria = setInterval(depurar, UN_DIA);
void depurar();

const depuracionDeArchivos = programarDepuracionDeArchivos();

/** Con `DEPURAR_HUERFANOS=false` o con una carpeta de archivos insegura no se programa y queda dicho en el registro. */
function programarDepuracionDeArchivos(): NodeJS.Timeout | null {
  if (!configuracion.DEPURAR_HUERFANOS) {
    app.log.warn('La depuración de archivos huérfanos está APAGADA (DEPURAR_HUERFANOS=false).');
    return null;
  }
  try {
    const depurador = crearDepuradorDeArchivosHuerfanos({
      info: (mensaje) => app.log.info(mensaje),
      advertencia: (mensaje) => app.log.warn(mensaje),
    });
    const depurarArchivos = () =>
      depurador.ejecutar().catch((error: unknown) => app.log.error(error, 'Depuración de archivos huérfanos'));
    void depurarArchivos();
    return setInterval(depurarArchivos, UN_DIA);
  } catch (error) {
    app.log.error(error, 'Depuración de archivos huérfanos desactivada');
    return null;
  }
}

/** En producción la app no arranca sin qpdf 11+; en desarrollo solo avisa (los PDF no se podrán revisar). */
async function revisarQpdf(): Promise<void> {
  try {
    app.log.info(`qpdf ${await verificarQpdf(configuracion.RUTA_QPDF)}`);
  } catch (error) {
    if (esProduccion) throw error;
    app.log.warn(`${(error as Error).message} Sin él no se aceptan PDF.`);
  }
}

async function detener(senal: string): Promise<void> {
  app.log.info(`Recibida ${senal}, cerrando…`);
  clearInterval(limpiezaSesiones);
  clearInterval(depuracionDiaria);
  if (depuracionDeArchivos) clearInterval(depuracionDeArchivos);
  await app.close();
  await grupoConexiones.end();
  process.exit(0);
}

process.on('SIGINT', () => void detener('SIGINT'));
process.on('SIGTERM', () => void detener('SIGTERM'));

await app.listen({ port: configuracion.PUERTO, host: '0.0.0.0' });
