import { construirAplicacion } from './aplicacion.js';
import { configuracion, esProduccion } from './configuracion.js';
import { grupoConexiones } from './modulos/core/base-datos/conexion.js';
import { crearDepuradorDeArchivosHuerfanos } from './modulos/core/archivos/contexto.js';
import { verificarQpdf } from './modulos/core/archivos/infraestructura/qpdf/verificador-de-qpdf.js';
import { depurarAuditoria } from './modulos/core/bitacora/contexto.js';
import { crearProcesadorDeBandeja, depurarCorreos, diagnosticarLlaveDeCorreo } from './modulos/core/correo/bandeja.js';
import { limpiarSesionesVencidas } from './modulos/core/identidad/contexto.js';
import { cargaAutomaticaEncendida, cargaDeTiposDeCambio } from './modulos/core/monedas/contexto.js';

const UNA_HORA = 60 * 60 * 1000;
const UN_DIA = 24 * UNA_HORA;
const QUINCE_MINUTOS = 15 * 60 * 1000;

const app = await construirAplicacion();
await revisarQpdf();

const limpiezaSesiones = setInterval(() => {
  limpiarSesionesVencidas.ejecutar().catch((error: unknown) => app.log.error(error, 'Limpieza de sesiones'));
}, UNA_HORA);

const depurar = () =>
  depurarAuditoria.ejecutar().catch((error: unknown) => app.log.error(error, 'Depuración de la auditoría'));
const depuracionDiaria = setInterval(depurar, UN_DIA);
void depurar();

const depurarElCorreo = () =>
  depurarCorreos.ejecutar().catch((error: unknown) => app.log.error(error, 'Depuración de la bandeja de correos'));
const depuracionDeCorreos = setInterval(depurarElCorreo, UN_DIA);
void depurarElCorreo();

const bandejaDeCorreo = iniciarBandejaDeCorreo();

const depuracionDeArchivos = programarDepuracionDeArchivos();

const cargaDeTipos = programarCargaDeTiposDeCambio();

/**
 * Con `CARGAR_TIPOS_DE_CAMBIO=true` (apagada por omisión): al arrancar revisa la lista de monedas y los huecos, y cada
 * 15 minutos pregunta qué vuelta toca (06:00 el dólar, 09:30 las demás, de noche el dólar de mañana).
 */
function programarCargaDeTiposDeCambio(): NodeJS.Timeout | null {
  if (!cargaAutomaticaEncendida) {
    app.log.warn('La carga automática de tipos de cambio está APAGADA (CARGAR_TIPOS_DE_CAMBIO).');
    return null;
  }
  const alFallar = (error: unknown) => app.log.error(error, 'Carga de tipos de cambio del Banguat');
  void cargaDeTiposDeCambio
    .alArrancar()
    .then(() => cargaDeTiposDeCambio.siTocaAhora())
    .catch(alFallar);
  return setInterval(() => void cargaDeTiposDeCambio.siTocaAhora().catch(alFallar), QUINCE_MINUTOS);
}

/** Sin `CLAVE_SECRETOS` no arranca: no se podría leer la contraseña del servidor de correo. Los correos esperan en la bandeja. */
function iniciarBandejaDeCorreo() {
  const procesador = crearProcesadorDeBandeja({ error: (mensaje, error) => app.log.error(error, mensaje) });
  if (procesador) {
    procesador.iniciar();
    void avisarSiLaLlaveNoDescifra();
  } else void avisarQueFaltaLaLlave();
  return procesador;
}

/** La llave está, pero puede ser otra que la del cifrado: el error sale al arrancar, no en el primer envío. */
async function avisarSiLaLlaveNoDescifra(): Promise<void> {
  try {
    const diagnostico = await diagnosticarLlaveDeCorreo.verificarContrasena();
    if (diagnostico) app.log.error(diagnostico.mensaje);
  } catch (error) {
    app.log.warn(error, 'No se pudo comprobar la contraseña del servidor de correo.');
  }
}

/** Con un servidor de correo ya guardado, el aviso sale como error: así no pasa desapercibido en producción. */
async function avisarQueFaltaLaLlave(): Promise<void> {
  try {
    const { nivel, mensaje } = await diagnosticarLlaveDeCorreo.ejecutar();
    if (nivel === 'error') app.log.error(mensaje);
    else app.log.warn(mensaje);
  } catch (error) {
    app.log.warn(error, 'El envío de correo está APAGADO: falta CLAVE_SECRETOS.');
  }
}

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
  clearInterval(depuracionDeCorreos);
  if (depuracionDeArchivos) clearInterval(depuracionDeArchivos);
  if (cargaDeTipos) clearInterval(cargaDeTipos);
  await bandejaDeCorreo?.detener();
  await app.close();
  await grupoConexiones.end();
  process.exit(0);
}

process.on('SIGINT', () => void detener('SIGINT'));
process.on('SIGTERM', () => void detener('SIGTERM'));

await app.listen({ port: configuracion.PUERTO, host: '0.0.0.0' });
