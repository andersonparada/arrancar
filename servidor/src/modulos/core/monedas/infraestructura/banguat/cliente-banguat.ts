import type {
  FuenteDeTiposDeCambio,
  OpcionesDeConsulta,
  OpcionesDeMoneda,
  OpcionesDeRango,
} from '../../aplicacion/puertos/fuente-de-tipos-de-cambio.js';
import { FuenteNoDisponible } from '../../dominio/errores.js';
import type { MonedaDelBanguat, ResultadoDeConsulta } from '../../dominio/publicacion.js';
import {
  DOLAR,
  extraerMonedasDisponibles,
  extraerTipoDelDia,
  extraerTiposDelRango,
} from './extractor-de-respuestas.js';
import { leerTextoAcotado } from './lector-acotado.js';
import {
  solicitudDeLasVariables,
  solicitudDelDia,
  solicitudDelRango,
  solicitudDelRangoDeMoneda,
  type SolicitudSoap,
} from './sobres-soap.js';

/** URL del servicio del Banguat; se cambia con `URL_TIPO_DE_CAMBIO_BANGUAT`. */
export const URL_BANGUAT_POR_OMISION = 'https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx';

export interface OpcionesDelClienteBanguat {
  readonly url?: string;
  /** Espera máxima por la respuesta completa (10 s por omisión). */
  readonly tiempoMaximoMs?: number;
  /** Tamaño máximo de la respuesta (256 KB por omisión). */
  readonly maximoBytes?: number;
  /** Solo para las pruebas contra un servidor local: en producción la URL debe ser HTTPS. */
  readonly permitirHttpSinCifrar?: boolean;
}

/**
 * Cliente SOAP 1.1 del servicio de tipo de cambio del Banco de Guatemala, sin dependencias de XML.
 * Una sola URL fija, HTTPS, con tiempo máximo y tope de tamaño, y sin seguir redirecciones.
 */
export class ClienteBanguat implements FuenteDeTiposDeCambio {
  private readonly url: string;
  private readonly tiempoMaximoMs: number;
  private readonly maximoBytes: number;

  constructor(opciones: OpcionesDelClienteBanguat = {}) {
    this.url = opciones.url ?? URL_BANGUAT_POR_OMISION;
    this.tiempoMaximoMs = opciones.tiempoMaximoMs ?? 10_000;
    this.maximoBytes = opciones.maximoBytes ?? 256 * 1024;
    if (!this.url.startsWith('https://') && !opciones.permitirHttpSinCifrar) {
      throw new RangeError('La URL del servicio de tipo de cambio debe ser HTTPS.');
    }
  }

  async tipoDelDia(opciones: OpcionesDeConsulta): Promise<ResultadoDeConsulta> {
    return extraerTipoDelDia(await this.enviar(solicitudDelDia()), opciones.hoy, opciones.monedas);
  }

  async tiposDelRango(opciones: OpcionesDeRango): Promise<ResultadoDeConsulta> {
    const xml = await this.enviar(solicitudDelRango(opciones.desde, opciones.hasta));
    return extraerTiposDelRango(xml, opciones.hoy, { operacion: 'TipoCambioRango', monedas: [DOLAR] });
  }

  async tiposDeLaMoneda(opciones: OpcionesDeMoneda): Promise<ResultadoDeConsulta> {
    const { desde, hasta, codigoBanguat, moneda } = opciones;
    const xml = await this.enviar(solicitudDelRangoDeMoneda(desde, hasta, codigoBanguat));
    return extraerTiposDelRango(xml, opciones.hoy, {
      operacion: 'TipoCambioRangoMoneda',
      monedas: [{ moneda, codigoBanguat }],
    });
  }

  async monedasDisponibles(): Promise<readonly MonedaDelBanguat[]> {
    return extraerMonedasDisponibles(await this.enviar(solicitudDeLasVariables()));
  }

  private async enviar(solicitud: SolicitudSoap): Promise<string> {
    const respuesta = await this.pedir(solicitud);
    if (respuesta.status !== 200) {
      await respuesta.body?.cancel();
      throw new FuenteNoDisponible(`El Banguat respondió con el estado ${respuesta.status}.`);
    }
    return leerTextoAcotado(respuesta, this.maximoBytes);
  }

  private async pedir(solicitud: SolicitudSoap): Promise<Response> {
    try {
      return await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `"${solicitud.accion}"` },
        body: solicitud.cuerpo,
        redirect: 'manual',
        signal: AbortSignal.timeout(this.tiempoMaximoMs),
      });
    } catch {
      throw new FuenteNoDisponible('No se pudo consultar al Banguat (sin conexión o tiempo agotado).');
    }
  }
}
