import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { AlmacenamientoEnMemoria } from '../../../compartido/pruebas/dobles-compartidos.js';
import { CifradorAesGcm } from '../../infraestructura/cifrador-aes-gcm.js';
import { TransporteEnMemoria } from '../../infraestructura/transporte-en-memoria.js';
import { ServidorDeCorreoEnMemoria } from '../../pruebas/dobles-del-servidor-de-correo.js';
import { ColaEnMemoria, RegistroEnMemoria, correoPorEnviar } from '../../pruebas/dobles-de-la-bandeja.js';
import { CONTEXTO_DE_LA_CONTRASENA } from '../contexto-de-la-contrasena.js';
import { ProveedorDeTransporte } from '../proveedor-de-transporte.js';
import type { ConexionAlServidor } from '../puertos/fabrica-de-transporte.js';
import { CORREOS_POR_LOTE, EnviarLoteDeCorreos } from './enviar-lote-de-correos.js';

let cola: ColaEnMemoria;
let transporte: TransporteEnMemoria;
let repositorio: ServidorDeCorreoEnMemoria;
let almacenamiento: AlmacenamientoEnMemoria;
let registro: RegistroEnMemoria;
let conexiones: ConexionAlServidor[];
let ahora: number;
let lote: EnviarLoteDeCorreos;
let descifrador: CifradorAesGcm;

async function guardarServidor(activo = true): Promise<void> {
  const cifrador = new CifradorAesGcm({ actual: randomBytes(32).toString('base64') });
  repositorio.guardado = {
    servidor: 'smtp.proveedor.com',
    puerto: 587,
    seguridad: 'starttls',
    usuario: 'apikey',
    remitenteDireccion: 'notificaciones@ejemplo.com',
    remitenteNombre: 'Arrancar',
    activo,
    contrasena: cifrador.cifrar('secreta', CONTEXTO_DE_LA_CONTRASENA),
    ultimaPruebaEn: null,
    ultimaPruebaResultado: null,
    actualizadoEn: new Date(),
  };
  descifrador = cifrador;
}

beforeEach(async () => {
  cola = new ColaEnMemoria();
  transporte = new TransporteEnMemoria();
  repositorio = new ServidorDeCorreoEnMemoria();
  almacenamiento = new AlmacenamientoEnMemoria();
  registro = new RegistroEnMemoria();
  conexiones = [];
  ahora = 0;
  await guardarServidor();
  const proveedor = new ProveedorDeTransporte({
    repositorio,
    cifrador: descifrador,
    fabrica: {
      crear: (conexion) => {
        conexiones.push(conexion);
        return transporte;
      },
    },
  });
  lote = new EnviarLoteDeCorreos({ cola, proveedor, almacenamiento, registro, ahora: () => ahora });
});

const resultados = () => cola.resoluciones.map((r) => [r.id, r.resultado, r.codigo]);

describe('EnviarLoteDeCorreos', () => {
  it('sin nada en la bandeja no hace nada ni abre el transporte', async () => {
    expect(await lote.ejecutar()).toBe(0);
    expect(conexiones).toHaveLength(0);
  });

  it('envía el correo con el remitente fijo, el nombre visible, «responder a» y los destinatarios', async () => {
    cola.pendientes = [
      correoPorEnviar({
        responderA: 'empresa@ejemplo.com',
        destinatarios: [
          { clase: 'para', direccion: 'a@ejemplo.com', nombre: 'Ana' },
          { clase: 'copia', direccion: 'empresa@ejemplo.com', nombre: null },
        ],
      }),
    ];

    expect(await lote.ejecutar()).toBe(1);

    const [mensaje] = transporte.enviados;
    expect(mensaje?.desde.direccion.valor).toBe('notificaciones@ejemplo.com');
    expect(mensaje?.desde.nombre).toBe('Empresa por medio de Arrancar');
    expect(mensaje?.responderA?.valor).toBe('empresa@ejemplo.com');
    expect(mensaje?.para.map((p) => p.direccion.valor)).toEqual(['a@ejemplo.com']);
    expect(mensaje?.copia.map((p) => p.direccion.valor)).toEqual(['empresa@ejemplo.com']);
    expect(mensaje?.messageId).toBe('<id-1@arrancar.test>');
    expect(resultados()).toEqual([['correo-1', 'enviado', null]]);
    expect(conexiones[0]).toMatchObject({ servidor: 'smtp.proveedor.com', contrasena: 'secreta' });
  });

  it('adjunta el PDF leído del almacenamiento', async () => {
    almacenamiento.contenidos.set('correos/a.pdf', Buffer.from('%PDF-1.7 contenido'));
    cola.pendientes = [correoPorEnviar({ adjuntoRuta: 'correos/a.pdf', adjuntoNombre: 'comprobante.pdf' })];

    await lote.ejecutar();

    expect(transporte.enviados[0]?.adjuntos).toEqual([
      { nombre: 'comprobante.pdf', contenido: Buffer.from('%PDF-1.7 contenido') },
    ]);
  });

  it('si el PDF ya no está, el correo falla de forma permanente con el código ADJUNTO', async () => {
    cola.pendientes = [correoPorEnviar({ adjuntoRuta: 'correos/no-esta.pdf', adjuntoNombre: 'c.pdf' })];

    await lote.ejecutar();

    expect(resultados()).toEqual([['correo-1', 'permanente', 'ADJUNTO']]);
    expect(transporte.enviados).toHaveLength(0);
  });

  it('una dirección guardada que ya no sirve falla de forma permanente con el código DIRECCION', async () => {
    cola.pendientes = [correoPorEnviar({ destinatarios: [{ clase: 'para', direccion: 'a,b@x.com', nombre: null }] })];

    await lote.ejecutar();

    expect(resultados()).toEqual([['correo-1', 'permanente', 'DIRECCION']]);
  });

  it('pasa tal cual los fallos del transporte: temporal, permanente y los rechazados', async () => {
    cola.pendientes = [correoPorEnviar({ id: 'a' }), correoPorEnviar({ id: 'b' }), correoPorEnviar({ id: 'c' })];
    transporte.programarRespuesta({ resultado: 'temporal', codigo: 'ETIMEDOUT' });
    transporte.programarRespuesta({ resultado: 'permanente', codigo: '550' });
    transporte.programarRespuesta({ resultado: 'enviado', rechazados: ['proveedor@ejemplo.com'] });

    await lote.ejecutar();

    expect(resultados()).toEqual([
      ['a', 'temporal', 'ETIMEDOUT'],
      ['b', 'permanente', '550'],
      ['c', 'enviado', null],
    ]);
    expect(cola.resoluciones[2]?.rechazados).toEqual(['proveedor@ejemplo.com']);
  });

  it('un error de autenticación detiene el lote: lo que falta vuelve sin gastar intento ni tocar el servidor', async () => {
    cola.pendientes = [correoPorEnviar({ id: 'a' }), correoPorEnviar({ id: 'b' }), correoPorEnviar({ id: 'c' })];
    transporte.programarRespuesta({ resultado: 'autenticacion', codigo: 'EAUTH' });

    await lote.ejecutar();

    expect(resultados()).toEqual([
      ['a', 'autenticacion', 'EAUTH'],
      ['b', 'sin_servidor', null],
      ['c', 'sin_servidor', null],
    ]);
    expect(transporte.enviados).toHaveLength(0);
  });

  it('con el servidor apagado, sin contraseña o sin guardar, todo queda sin_servidor', async () => {
    cola.pendientes = [correoPorEnviar({ id: 'a' })];
    await guardarServidor(false);

    await lote.ejecutar();
    repositorio.guardado = null;
    cola.pendientes = [correoPorEnviar({ id: 'b' })];
    await lote.ejecutar();

    expect(resultados()).toEqual([
      ['a', 'sin_servidor', null],
      ['b', 'sin_servidor', null],
    ]);
  });

  it('pasados 3 minutos del lote, lo que falta no se envía y queda sin_servidor (el arriendo es de 5)', async () => {
    cola.pendientes = [correoPorEnviar({ id: 'a' }), correoPorEnviar({ id: 'b' })];
    transporte.enviar = async (mensaje) => {
      ahora += 4 * 60 * 1000;
      return { resultado: 'enviado', codigo: null, rechazados: [], duracionMs: mensaje.asunto.length };
    };

    await lote.ejecutar();

    expect(resultados()).toEqual([
      ['a', 'enviado', null],
      ['b', 'sin_servidor', null],
    ]);
  });

  it('un fallo inesperado del transporte queda temporal con ERROR_INTERNO y se registra', async () => {
    cola.pendientes = [correoPorEnviar()];
    transporte.enviar = async () => {
      throw new Error('algo raro');
    };

    await lote.ejecutar();

    expect(resultados()).toEqual([['correo-1', 'temporal', 'ERROR_INTERNO']]);
    expect(registro.errores).toHaveLength(1);
  });

  it('si no puede anotar el resultado lo registra y sigue con el siguiente', async () => {
    cola.pendientes = [correoPorEnviar({ id: 'a' }), correoPorEnviar({ id: 'b' })];
    cola.fallaAlResolver = true;

    expect(await lote.ejecutar()).toBe(2);
    expect(transporte.enviados).toHaveLength(2);
    expect(registro.errores).toHaveLength(2);
  });

  it('reutiliza el transporte entre lotes y arma otro si Soporte cambió la conexión', async () => {
    cola.pendientes = [correoPorEnviar({ id: 'a' })];
    await lote.ejecutar();
    cola.pendientes = [correoPorEnviar({ id: 'b' })];
    await lote.ejecutar();
    expect(conexiones).toHaveLength(1);

    repositorio.guardado = { ...repositorio.guardado!, usuario: 'otro' };
    cola.pendientes = [correoPorEnviar({ id: 'c' })];
    await lote.ejecutar();

    expect(conexiones.map((c) => c.usuario)).toEqual(['apikey', 'otro']);
    expect(transporte.cerrado).toBe(true);
  });

  it('un lote lleno avisa que puede haber más', async () => {
    cola.pendientes = Array.from({ length: CORREOS_POR_LOTE }, (_, i) => correoPorEnviar({ id: `c${i}` }));

    expect(await lote.ejecutar()).toBe(CORREOS_POR_LOTE);
  });
});
