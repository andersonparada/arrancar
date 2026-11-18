import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FuenteNoDisponible, RespuestaInvalida } from '../../dominio/errores.js';
import {
  RANGO_CON_FIN_DE_SEMANA,
  RESPUESTA_CON_DOCTYPE,
  respuestaDelDia,
  respuestaDelRango,
} from '../../pruebas/respuestas-grabadas-del-banguat.js';
import { ClienteBanguat } from './cliente-banguat.js';

const HOY = '2026-11-18';

type Manejador = (solicitud: IncomingMessage, respuesta: ServerResponse, cuerpo: string) => void;

describe('ClienteBanguat contra un servidor local falso', () => {
  let servidor: Server;
  let url: string;
  let manejador: Manejador;
  const recibidas: { accion: string | undefined; cuerpo: string }[] = [];

  const cliente = (opciones: { tiempoMaximoMs?: number; maximoBytes?: number } = {}) =>
    new ClienteBanguat({ url, permitirHttpSinCifrar: true, ...opciones });
  const responder =
    (estado: number, texto: string, cabeceras: Record<string, string> = {}): Manejador =>
    (_solicitud, respuesta) => {
      respuesta.writeHead(estado, { 'Content-Type': 'text/xml', ...cabeceras }).end(texto);
    };

  beforeAll(async () => {
    servidor = createServer((solicitud, respuesta) => {
      let cuerpo = '';
      solicitud.on('data', (parte) => (cuerpo += parte));
      solicitud.on('end', () => {
        recibidas.push({ accion: solicitud.headers.soapaction as string | undefined, cuerpo });
        manejador(solicitud, respuesta, cuerpo);
      });
    });
    await new Promise<void>((resolver) => servidor.listen(0, '127.0.0.1', resolver));
    url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/TipoCambio.asmx`;
  });

  afterAll(async () => {
    servidor.closeAllConnections();
    await new Promise((resolver) => servidor.close(resolver));
  });

  beforeEach(() => {
    recibidas.length = 0;
  });

  it('pide el tipo del día con SOAP 1.1 y lo extrae', async () => {
    manejador = responder(200, respuestaDelDia('18/11/2026', '7.64489'));
    const resultado = await cliente().tipoDelDia({ hoy: HOY });
    expect(resultado.publicaciones).toEqual([{ moneda: 'USD', fecha: '2026-11-18', referencia: '7.64489' }]);
    expect(recibidas[0]?.accion).toBe('"http://www.banguat.gob.gt/variables/ws/TipoCambioDia"');
  });

  it('pide el rango con las fechas en dd/mm/aaaa y lo extrae', async () => {
    manejador = responder(200, RANGO_CON_FIN_DE_SEMANA);
    const resultado = await cliente().tiposDelRango({ hoy: HOY, desde: '2026-11-13', hasta: '2026-11-18' });
    expect(resultado.publicaciones).toHaveLength(6);
    expect(recibidas[0]?.cuerpo).toContain('<fechainit>13/11/2026</fechainit><fechafin>18/11/2026</fechafin>');
  });

  it('un rango sin datos devuelve un resultado vacío', async () => {
    manejador = responder(200, respuestaDelRango([]));
    const resultado = await cliente().tiposDelRango({ hoy: HOY, desde: '2026-12-01', hasta: '2026-12-05' });
    expect(resultado.publicaciones).toEqual([]);
  });

  it('un error 500 es fuente no disponible', async () => {
    manejador = responder(500, 'Error interno');
    await expect(cliente().tipoDelDia({ hoy: HOY })).rejects.toBeInstanceOf(FuenteNoDisponible);
  });

  it('una redirección no se sigue', async () => {
    manejador = responder(302, '', { Location: 'http://otro.example/' });
    await expect(cliente().tipoDelDia({ hoy: HOY })).rejects.toBeInstanceOf(FuenteNoDisponible);
    expect(recibidas).toHaveLength(1);
  });

  it('una demora mayor al tiempo máximo es fuente no disponible', async () => {
    manejador = () => undefined;
    await expect(cliente({ tiempoMaximoMs: 100 }).tipoDelDia({ hoy: HOY })).rejects.toBeInstanceOf(FuenteNoDisponible);
  });

  it('una respuesta enorme se rechaza sin leerla completa', async () => {
    manejador = responder(200, 'x'.repeat(2_000));
    await expect(cliente({ maximoBytes: 1_000 }).tipoDelDia({ hoy: HOY })).rejects.toBeInstanceOf(RespuestaInvalida);
  });

  it('una respuesta enorme sin tamaño anunciado también se corta', async () => {
    manejador = (_solicitud, respuesta) => {
      respuesta.writeHead(200, { 'Transfer-Encoding': 'chunked' });
      respuesta.write('x'.repeat(1_500));
      respuesta.end('y'.repeat(1_500));
    };
    await expect(cliente({ maximoBytes: 1_000 }).tipoDelDia({ hoy: HOY })).rejects.toBeInstanceOf(RespuestaInvalida);
  });

  it('un XML con DOCTYPE es respuesta inválida', async () => {
    manejador = responder(200, RESPUESTA_CON_DOCTYPE);
    await expect(cliente().tipoDelDia({ hoy: HOY })).rejects.toBeInstanceOf(RespuestaInvalida);
  });

  it('una página HTML en vez de SOAP es respuesta inválida', async () => {
    manejador = responder(200, '<html>En mantenimiento</html>');
    await expect(cliente().tipoDelDia({ hoy: HOY })).rejects.toBeInstanceOf(RespuestaInvalida);
  });

  it('un valor fuera de banda no se devuelve como publicación', async () => {
    manejador = responder(200, respuestaDelDia('18/11/2026', '764.489'));
    const resultado = await cliente().tipoDelDia({ hoy: HOY });
    expect(resultado.publicaciones).toEqual([]);
    expect(resultado.rechazadas[0]?.motivo).toBe('valor_fuera_de_rango');
  });

  it('sin servidor escuchando es fuente no disponible', async () => {
    const sinServidor = new ClienteBanguat({ url: 'http://127.0.0.1:1/', permitirHttpSinCifrar: true });
    await expect(sinServidor.tipoDelDia({ hoy: HOY })).rejects.toBeInstanceOf(FuenteNoDisponible);
  });

  it('exige HTTPS salvo que se permita expresamente', () => {
    expect(() => new ClienteBanguat({ url: 'http://www.banguat.gob.gt/x' })).toThrow(RangeError);
    expect(() => new ClienteBanguat()).not.toThrow();
  });
});
