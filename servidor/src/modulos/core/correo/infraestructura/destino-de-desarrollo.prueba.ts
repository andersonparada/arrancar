import { createServer, type Server } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { esquemaConfiguracion } from '../../../../configuracion.js';
import type { ConexionAlServidor } from '../aplicacion/puertos/fabrica-de-transporte.js';
import type { MensajeDeSalida } from '../aplicacion/transporte-de-correo.js';
import { DireccionDeEnvio } from '../dominio/direccion-de-envio.js';
import { FabricaDeTransporteNodemailer, destinoDeDesarrolloDelEntorno } from './fabrica-de-transporte-nodemailer.js';

const BASE = { URL_PUBLICA: 'http://localhost:3100', DATABASE_URL: 'postgres://x' };

describe('variables de entorno del correo de desarrollo', () => {
  it('se aceptan fuera de producción, con el 1025 por omisión', () => {
    const entorno = esquemaConfiguracion.parse({
      ...BASE,
      NODE_ENV: 'development',
      CORREO_DESARROLLO_SERVIDOR: '127.0.0.1',
    });

    expect(entorno).toMatchObject({ CORREO_DESARROLLO_SERVIDOR: '127.0.0.1', CORREO_DESARROLLO_PUERTO: 1025 });
  });

  it('en producción la app no arranca con ellas', () => {
    const resultado = esquemaConfiguracion.safeParse({
      ...BASE,
      NODE_ENV: 'production',
      CORREO_DESARROLLO_SERVIDOR: '127.0.0.1',
    });

    expect(resultado.success).toBe(false);
    expect(JSON.stringify(resultado.error?.issues)).toContain('CORREO_DESARROLLO_SERVIDOR');
  });

  it('sin la variable no hay destino de desarrollo, y en producción se vuelve a rechazar', () => {
    expect(destinoDeDesarrolloDelEntorno({ CORREO_DESARROLLO_PUERTO: 1025 }, false)).toBeNull();
    expect(
      destinoDeDesarrolloDelEntorno({ CORREO_DESARROLLO_SERVIDOR: 'mailpit', CORREO_DESARROLLO_PUERTO: 1025 }, false),
    ).toEqual({
      servidor: 'mailpit',
      puerto: 1025,
    });
    expect(() =>
      destinoDeDesarrolloDelEntorno({ CORREO_DESARROLLO_SERVIDOR: 'mailpit', CORREO_DESARROLLO_PUERTO: 1025 }, true),
    ).toThrow(/producción/);
  });
});

/** Un SMTP mínimo que anota lo que recibe: sirve de Mailpit en la prueba. */
function servidorSmtp(recibido: string[]): Promise<{ servidor: Server; puerto: number }> {
  const servidor = createServer((socket) => {
    let enDatos = false;
    socket.write('220 mailpit-de-prueba ESMTP\r\n');
    socket.on('data', (trozo) => {
      for (const linea of trozo.toString().split('\r\n').filter(Boolean)) {
        recibido.push(linea);
        if (enDatos) {
          if (linea === '.') {
            enDatos = false;
            socket.write('250 recibido\r\n');
          }
        } else if (linea.startsWith('EHLO')) socket.write('250 mailpit-de-prueba\r\n');
        else if (linea === 'DATA') {
          enDatos = true;
          socket.write('354 siga\r\n');
        } else if (linea === 'QUIT') socket.end('221 adiós\r\n');
        else socket.write('250 ok\r\n');
      }
    });
  });
  return new Promise((resolver) => {
    servidor.listen(0, '127.0.0.1', () =>
      resolver({ servidor, puerto: (servidor.address() as { port: number }).port }),
    );
  });
}

const GUARDADO: ConexionAlServidor = {
  servidor: 'smtp.proveedor.invalido',
  puerto: 587,
  seguridad: 'starttls',
  usuario: 'apikey',
  contrasena: 'contrasena-secreta',
};

const MENSAJE: MensajeDeSalida = {
  desde: { direccion: DireccionDeEnvio.crear('notificaciones@arrancar.test'), nombre: 'Arrancar' },
  responderA: null,
  para: [{ direccion: DireccionDeEnvio.crear('proveedor@ejemplo.com'), nombre: null }],
  copia: [],
  asunto: 'Aviso de pago 1',
  texto: 'Hola',
  html: '<p>Hola</p>',
  messageId: '<prueba@arrancar.test>',
  adjuntos: [],
};

describe('FabricaDeTransporteNodemailer con destino de desarrollo', () => {
  let abierto: Server | null = null;
  afterEach(() => abierto?.close());

  it('manda sin cifrado ni credenciales al servidor de mentira y no toca el guardado', async () => {
    const recibido: string[] = [];
    const { servidor, puerto } = await servidorSmtp(recibido);
    abierto = servidor;
    const transporte = new FabricaDeTransporteNodemailer({ servidor: '127.0.0.1', puerto }).crear(GUARDADO);

    const respuesta = await transporte.enviar(MENSAJE);
    await transporte.cerrar();

    expect(respuesta).toMatchObject({ resultado: 'enviado', rechazados: [] });
    expect(recibido).toContain('RCPT TO:<proveedor@ejemplo.com>');
    expect(recibido.some((linea) => linea.startsWith('AUTH') || linea.includes('STARTTLS'))).toBe(false);
    expect(recibido.join('\n')).not.toContain('contrasena-secreta');
  });
});
