import { configuracion as entorno } from '../../../configuracion.js';
import { bd } from '../base-datos/conexion.js';
import { configuracion } from '../configuracion/contexto.js';
import type { Auditoria } from '../compartido/aplicacion/auditoria.js';
import type { DocumentosProtegidos } from '../compartido/aplicacion/documentos-protegidos.js';
import type { UnidadDeTrabajo } from '../compartido/aplicacion/unidad-de-trabajo.js';
import { almacenamiento } from '../compartido/infraestructura/almacenamiento-local.js';
import { TareasDeLaTransaccionPostgres } from '../compartido/infraestructura/tareas-de-la-transaccion-postgres.js';
import type { BandejaDeSalida } from './aplicacion/bandeja-de-salida.js';
import { DiagnosticarLlaveDeCorreo } from './aplicacion/casos-uso/diagnosticar-llave-de-correo.js';
import { DepurarCorreos } from './aplicacion/casos-uso/depurar-correos.js';
import { BandejaDeSalidaDeCore } from './aplicacion/bandeja-de-salida-de-core.js';
import { CancelarCorreo } from './aplicacion/casos-uso/cancelar-correo.js';
import { EncolarCorreo } from './aplicacion/casos-uso/encolar-correo.js';
import { EnviarLoteDeCorreos, type RegistroDeErrores } from './aplicacion/casos-uso/enviar-lote-de-correos.js';
import { ProcesarBandeja } from './aplicacion/procesar-bandeja.js';
import { ProveedorDeTransporte } from './aplicacion/proveedor-de-transporte.js';
import { cifradorDeSecretos } from './infraestructura/cifrador-del-entorno.js';
import { DespertadorDeBandeja } from './infraestructura/despertador-de-bandeja.js';
import {
  FabricaDeTransporteNodemailer,
  destinoDeDesarrolloDelEntorno,
} from './infraestructura/fabrica-de-transporte-nodemailer.js';
import { ParametrosEnConfiguracion } from './infraestructura/parametros-en-configuracion.js';
import { ColaDeEnvioDrizzle } from './infraestructura/persistencia/cola-de-envio.drizzle.js';
import { HistorialDeCorreosDrizzle } from './infraestructura/persistencia/historial-de-correos.drizzle.js';
import { RepositorioDeCorreosDrizzle } from './infraestructura/persistencia/repositorio-de-correos.drizzle.js';
import { ServidorDeCorreoDrizzle } from './infraestructura/persistencia/servidor-de-correo.drizzle.js';

/** Lo que core.correo lee de la configuración de la instalación. */
export const parametrosDeCorreo = new ParametrosEnConfiguracion(configuracion.lector);
const parametros = parametrosDeCorreo;
const cola = new ColaDeEnvioDrizzle(bd);
/** Une a quien encola con el trabajador de la bandeja. */
export const despertadorDeBandeja = new DespertadorDeBandeja();
const despertador = despertadorDeBandeja;

/** Lo usa el servidor una vez al día. */
export const depurarCorreos = new DepurarCorreos({ depurador: cola, parametros });

/** Lo que la bandeja pública toma de las dependencias compartidas. */
interface PiezasDeLaBandeja {
  documentos: DocumentosProtegidos;
  unidadDeTrabajo: UnidadDeTrabajo;
  auditoria: Auditoria;
}

/**
 * El puerto público de core para mandar correo: los módulos lo reciben con las dependencias compartidas y encolan
 * dentro de su unidad de trabajo.
 */
export function crearBandejaDeSalida({ documentos, unidadDeTrabajo, auditoria }: PiezasDeLaBandeja): BandejaDeSalida {
  const historial = new HistorialDeCorreosDrizzle();
  return new BandejaDeSalidaDeCore({
    encolar: new EncolarCorreo({
      repositorio: new RepositorioDeCorreosDrizzle(),
      documentos,
      parametros,
      tareas: new TareasDeLaTransaccionPostgres(),
      despertador,
      dominioDeMensajes: new URL(entorno.URL_PUBLICA).hostname,
    }),
    cancelarCorreo: new CancelarCorreo({ unidadDeTrabajo, historial, auditoria }),
    historial,
    auditoria,
    unidadDeTrabajo,
  });
}

/**
 * El trabajador de la bandeja para `principal.ts`, o `null` si falta `CLAVE_SECRETOS`: sin la llave no se puede leer
 * la contraseña del servidor y no tiene sentido arrancarlo (los correos esperan en la bandeja).
 */
export function crearProcesadorDeBandeja(registro: RegistroDeErrores): ProcesarBandeja | null {
  if (!cifradorDeSecretos.disponible) return null;
  const proveedor = new ProveedorDeTransporte({
    repositorio: new ServidorDeCorreoDrizzle(bd),
    cifrador: cifradorDeSecretos,
    fabrica: new FabricaDeTransporteNodemailer(destinoDeDesarrolloDelEntorno()),
  });
  const procesador = new ProcesarBandeja({
    lote: new EnviarLoteDeCorreos({ cola, proveedor, almacenamiento, registro }),
    registro,
    alCerrar: () => proveedor.cerrar(),
  });
  despertador.alDespertar(() => procesador.despertar());
  return procesador;
}

/** Lo que `principal.ts` consulta al arrancar sin `CLAVE_SECRETOS`, para avisar si ya hay un servidor guardado. */
export const diagnosticarLlaveDeCorreo = new DiagnosticarLlaveDeCorreo(new ServidorDeCorreoDrizzle(bd));
