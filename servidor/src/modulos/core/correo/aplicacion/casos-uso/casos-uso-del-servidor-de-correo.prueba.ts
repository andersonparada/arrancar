import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  LlaveDeSecretosNoDisponible,
  ServidorDeCorreoInvalido,
  ServidorDeCorreoNoConfigurado,
} from '../../dominio/errores-del-servidor-de-correo.js';
import { CifradorAesGcm } from '../../infraestructura/cifrador-aes-gcm.js';
import { TransporteEnMemoria } from '../../infraestructura/transporte-en-memoria.js';
import { ServidorDeCorreoEnMemoria } from '../../pruebas/dobles-del-servidor-de-correo.js';
import { CONTEXTO_DE_LA_CONTRASENA } from '../contexto-de-la-contrasena.js';
import type { ConexionAlServidor } from '../puertos/fabrica-de-transporte.js';
import { EnviarPrueba } from './enviar-prueba.js';
import { GuardarServidorDeCorreo, type EntradaDeGuardado } from './guardar-servidor-de-correo.js';
import { ObtenerServidorDeCorreo } from './obtener-servidor-de-correo.js';

const SOLICITANTE = { usuarioId: 'usuario-de-soporte', direccionIp: '10.1.1.1' };
const ENTRADA: EntradaDeGuardado = {
  servidor: 'smtp.proveedor.com',
  puerto: 587,
  seguridad: 'starttls',
  usuario: 'apikey',
  contrasena: 'la-contrasena-secreta',
  remitenteDireccion: 'notificaciones@ejemplo.com',
  remitenteNombre: 'Arrancar',
  activo: true,
};

let repositorio: ServidorDeCorreoEnMemoria;
let cifrador: CifradorAesGcm;
let guardar: GuardarServidorDeCorreo;

beforeEach(() => {
  repositorio = new ServidorDeCorreoEnMemoria();
  cifrador = new CifradorAesGcm({ actual: randomBytes(32).toString('base64') });
  guardar = new GuardarServidorDeCorreo({ repositorio, cifrador, permitirRedInterna: false });
});

describe('ObtenerServidorDeCorreo', () => {
  it('sin servidor guardado responde un servidor vacío y dice si hay llave', async () => {
    const dto = await new ObtenerServidorDeCorreo({ repositorio, cifrador }).ejecutar();

    expect(dto).toMatchObject({ configurado: false, contrasenaConfigurada: false, llaveDisponible: true });
  });
});

describe('GuardarServidorDeCorreo', () => {
  it('guarda cifrada la contraseña y nunca la devuelve', async () => {
    const dto = await guardar.ejecutar(SOLICITANTE, ENTRADA);

    expect(dto).toMatchObject({ configurado: true, contrasenaConfigurada: true, activo: true });
    expect(JSON.stringify(dto)).not.toContain('la-contrasena-secreta');
    const guardada = repositorio.guardado?.contrasena;
    expect(guardada?.cifrado.toString('utf8')).not.toContain('la-contrasena-secreta');
    expect(cifrador.descifrar(guardada!, CONTEXTO_DE_LA_CONTRASENA)).toBe('la-contrasena-secreta');
  });

  it('deja la entrada de bitácora sin la contraseña', async () => {
    await guardar.ejecutar(SOLICITANTE, ENTRADA);

    const [entrada] = repositorio.bitacora;
    expect(entrada).toMatchObject({ accion: 'correo.servidor.guardar', usuarioId: 'usuario-de-soporte' });
    expect(entrada?.detalle).toMatchObject({ servidor: 'smtp.proveedor.com', contrasenaCambiada: true });
    expect(JSON.stringify(entrada)).not.toContain('la-contrasena-secreta');
  });

  it('sin contraseña nueva conserva la guardada', async () => {
    await guardar.ejecutar(SOLICITANTE, ENTRADA);
    const antes = repositorio.guardado?.contrasena;

    await guardar.ejecutar(SOLICITANTE, { ...ENTRADA, contrasena: undefined, remitenteNombre: 'Otro' });

    expect(repositorio.guardado?.contrasena).toBe(antes);
    expect(repositorio.bitacora[1]?.detalle).toMatchObject({ contrasenaCambiada: false });
  });

  it('al cambiar el servidor exige escribir otra vez la contraseña', async () => {
    await guardar.ejecutar(SOLICITANTE, ENTRADA);

    await expect(
      guardar.ejecutar(SOLICITANTE, { ...ENTRADA, contrasena: undefined, servidor: 'smtp.otro.com' }),
    ).rejects.toThrow(ServidorDeCorreoInvalido);
  });

  it('no deja activar el servidor sin contraseña', async () => {
    await expect(guardar.ejecutar(SOLICITANTE, { ...ENTRADA, contrasena: undefined })).rejects.toThrow(
      ServidorDeCorreoInvalido,
    );
  });

  it('sin la llave del entorno no guarda una contraseña', async () => {
    const sinLlave = new GuardarServidorDeCorreo({
      repositorio,
      cifrador: new CifradorAesGcm({ actual: undefined }),
      permitirRedInterna: false,
    });

    await expect(sinLlave.ejecutar(SOLICITANTE, ENTRADA)).rejects.toThrow(LlaveDeSecretosNoDisponible);
    expect(repositorio.guardado).toBeNull();
  });

  it('puede guardar sin contraseña si queda apagado', async () => {
    const dto = await guardar.ejecutar(SOLICITANTE, { ...ENTRADA, contrasena: undefined, activo: false });

    expect(dto).toMatchObject({ configurado: true, contrasenaConfigurada: false, activo: false });
  });
});

describe('EnviarPrueba', () => {
  let transporte: TransporteEnMemoria;
  let conexiones: ConexionAlServidor[];
  let enviarPrueba: EnviarPrueba;

  beforeEach(() => {
    transporte = new TransporteEnMemoria();
    conexiones = [];
    const fabrica = {
      crear: (conexion: ConexionAlServidor) => {
        conexiones.push(conexion);
        return transporte;
      },
    };
    enviarPrueba = new EnviarPrueba({ repositorio, cifrador, fabrica });
  });

  it('sin servidor guardado no hay nada que probar', async () => {
    await expect(enviarPrueba.ejecutar(SOLICITANTE, 'a@b.com')).rejects.toThrow(ServidorDeCorreoNoConfigurado);
  });

  it('manda el correo con la contraseña descifrada, anota el resultado y cierra el transporte', async () => {
    await guardar.ejecutar(SOLICITANTE, { ...ENTRADA, activo: false });

    const resultado = await enviarPrueba.ejecutar(SOLICITANTE, 'Destino@Ejemplo.com');

    expect(resultado).toEqual({ resultado: 'enviado', codigo: null });
    expect(conexiones[0]?.contrasena).toBe('la-contrasena-secreta');
    expect(transporte.enviados[0]?.para[0]?.direccion.valor).toBe('Destino@ejemplo.com');
    expect(transporte.cerrado).toBe(true);
    expect(repositorio.guardado?.ultimaPruebaResultado).toBe('enviado');
  });

  it('informa solo el resultado y el código, y deja la entrada en la bitácora sin contraseña', async () => {
    await guardar.ejecutar(SOLICITANTE, ENTRADA);
    transporte.programarRespuesta({ resultado: 'autenticacion', codigo: 'EAUTH' });

    const resultado = await enviarPrueba.ejecutar(SOLICITANTE, 'a@ejemplo.com');

    expect(resultado).toEqual({ resultado: 'autenticacion', codigo: 'EAUTH' });
    const entrada = repositorio.bitacora.at(-1);
    expect(entrada).toMatchObject({ accion: 'correo.servidor.probar' });
    expect(entrada?.detalle).toMatchObject({
      resultado: 'autenticacion',
      codigo: 'EAUTH',
      destinoDominio: 'ejemplo.com',
    });
    expect(JSON.stringify(entrada)).not.toContain('la-contrasena-secreta');
  });

  it('rechaza un destino que no sirve para enviar, sin tocar el transporte', async () => {
    await guardar.ejecutar(SOLICITANTE, ENTRADA);

    await expect(enviarPrueba.ejecutar(SOLICITANTE, 'a@b.com,c@d.com')).rejects.toThrow();
    expect(conexiones).toHaveLength(0);
  });
});
