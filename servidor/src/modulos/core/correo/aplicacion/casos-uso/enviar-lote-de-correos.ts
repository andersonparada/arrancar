import type { Almacenamiento } from '../../../compartido/aplicacion/almacenamiento.js';
import { DireccionDeEnvio } from '../../dominio/direccion-de-envio.js';
import { DireccionNoUtilizable } from '../../dominio/errores-de-correo.js';
import type { ColaDeEnvio, CorreoPorEnviar, Resolucion } from '../puertos/cola-de-envio.js';
import type { ProveedorDeTransporte, TransporteListo } from '../proveedor-de-transporte.js';
import type { MensajeDeSalida, PersonaDeCorreo } from '../transporte-de-correo.js';

/** Cuántos correos toma el trabajador cada vez. */
export const CORREOS_POR_LOTE = 10;
/** Arriendo de cada correo tomado: si el proceso cae, a los 5 minutos otro lo retoma. */
export const MINUTOS_DE_ARRIENDO = 5;
/** Pasado este tiempo desde que se tomó el lote, lo que falta no se envía (el arriendo de los últimos se acaba). */
const PLAZO_DEL_LOTE_EN_MS = 3 * 60 * 1000;

export interface RegistroDeErrores {
  error(mensaje: string, error: unknown): void;
}

interface Dependencias {
  cola: ColaDeEnvio;
  proveedor: ProveedorDeTransporte;
  almacenamiento: Pick<Almacenamiento, 'leer'>;
  registro: RegistroDeErrores;
  /** Se inyecta para fijar el reloj en las pruebas. */
  ahora?: () => number;
}

class AdjuntoNoDisponible extends Error {}

/** Un fallo antes de llegar al servidor: lo propio del correo no se arregla reintentando; lo demás sí. */
function clasificarFallo(error: unknown): Pick<Resolucion, 'resultado' | 'codigo'> {
  if (error instanceof AdjuntoNoDisponible) return { resultado: 'permanente', codigo: 'ADJUNTO' };
  if (error instanceof DireccionNoUtilizable) return { resultado: 'permanente', codigo: 'DIRECCION' };
  return { resultado: 'temporal', codigo: 'ERROR_INTERNO' };
}

async function aBuffer(contenido: AsyncIterable<Buffer | string>): Promise<Buffer> {
  const trozos: Buffer[] = [];
  for await (const trozo of contenido) trozos.push(Buffer.from(trozo));
  return Buffer.concat(trozos);
}

const personas = (correo: CorreoPorEnviar, clase: 'para' | 'copia'): PersonaDeCorreo[] =>
  correo.destinatarios
    .filter((d) => d.clase === clase)
    .map((d) => ({ direccion: DireccionDeEnvio.crear(d.direccion), nombre: d.nombre }));

/**
 * Toma un lote de la bandeja y envía cada correo con el transporte de la instalación. Cada resultado se anota con
 * `resolver` (que decide la espera siguiente en la base). Si el servidor rechaza la autenticación, lo que queda del
 * lote no se intenta y vuelve a la cola sin gastar intento.
 */
export class EnviarLoteDeCorreos {
  constructor(private readonly dependencias: Dependencias) {}

  /** @returns cuántos correos tomó (si fue un lote completo, quizá quedan más). */
  async ejecutar(): Promise<number> {
    const correos = await this.dependencias.cola.tomar(CORREOS_POR_LOTE, MINUTOS_DE_ARRIENDO);
    if (correos.length === 0) return 0;
    const ahora = this.dependencias.ahora ?? Date.now;
    const inicio = ahora();
    let listo = await this.transporte();
    for (const correo of correos) {
      const sinTiempo = ahora() - inicio > PLAZO_DEL_LOTE_EN_MS;
      const resolucion = listo && !sinTiempo ? await this.enviar(listo, correo) : sinServidor(correo.id);
      if (resolucion.resultado === 'autenticacion') listo = null;
      await this.anotar(resolucion);
    }
    return correos.length;
  }

  private async transporte(): Promise<TransporteListo | null> {
    try {
      return await this.dependencias.proveedor.obtener();
    } catch {
      return null;
    }
  }

  private async enviar(listo: TransporteListo, correo: CorreoPorEnviar): Promise<Resolucion> {
    const inicio = Date.now();
    try {
      const respuesta = await listo.transporte.enviar(await this.armar(listo, correo));
      return { id: correo.id, ...respuesta };
    } catch (error) {
      this.dependencias.registro.error('No se pudo armar o enviar un correo', error);
      return { id: correo.id, ...clasificarFallo(error), rechazados: [], duracionMs: Date.now() - inicio };
    }
  }

  private async armar({ remitente }: TransporteListo, correo: CorreoPorEnviar): Promise<MensajeDeSalida> {
    return {
      desde: { direccion: remitente.direccion, nombre: correo.nombreVisible },
      responderA: correo.responderA ? DireccionDeEnvio.crear(correo.responderA) : null,
      para: personas(correo, 'para'),
      copia: personas(correo, 'copia'),
      asunto: correo.asunto,
      texto: correo.texto,
      html: correo.html,
      messageId: correo.messageId,
      adjuntos: await this.adjuntosDe(correo),
    };
  }

  private async adjuntosDe(correo: CorreoPorEnviar): Promise<MensajeDeSalida['adjuntos']> {
    if (!correo.adjuntoRuta) return [];
    try {
      const contenido = await aBuffer(await this.dependencias.almacenamiento.leer(correo.adjuntoRuta));
      return [{ nombre: correo.adjuntoNombre ?? 'comprobante.pdf', contenido }];
    } catch {
      throw new AdjuntoNoDisponible();
    }
  }

  private async anotar(resolucion: Resolucion): Promise<void> {
    try {
      await this.dependencias.cola.resolver(resolucion);
    } catch (error) {
      this.dependencias.registro.error('No se pudo anotar el resultado de un correo', error);
    }
  }
}

const sinServidor = (id: string): Resolucion => ({
  id,
  resultado: 'sin_servidor',
  codigo: null,
  rechazados: [],
  duracionMs: 0,
});
