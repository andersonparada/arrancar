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
import { EnviarLoteDeCorreos } from './enviar-lote-de-correos.js';

const llaveA = randomBytes(32).toString('base64');
const llaveB = randomBytes(32).toString('base64');

let repositorio: ServidorDeCorreoEnMemoria;
let cola: ColaEnMemoria;
let registro: RegistroEnMemoria;
let conexiones: ConexionAlServidor[];

function loteCon(cifrador: CifradorAesGcm): EnviarLoteDeCorreos {
  const transporte = new TransporteEnMemoria();
  const proveedor = new ProveedorDeTransporte({
    repositorio,
    cifrador,
    fabrica: {
      crear: (conexion) => {
        conexiones.push(conexion);
        return transporte;
      },
    },
  });
  return new EnviarLoteDeCorreos({ cola, proveedor, almacenamiento: new AlmacenamientoEnMemoria(), registro });
}

beforeEach(() => {
  repositorio = new ServidorDeCorreoEnMemoria();
  cola = new ColaEnMemoria();
  registro = new RegistroEnMemoria();
  conexiones = [];
  repositorio.guardado = {
    servidor: 'smtp.proveedor.com',
    puerto: 587,
    seguridad: 'starttls',
    usuario: 'apikey',
    remitenteDireccion: 'notificaciones@ejemplo.com',
    remitenteNombre: 'Arrancar',
    activo: true,
    contrasena: new CifradorAesGcm({ actual: llaveA }).cifrar('secreta', CONTEXTO_DE_LA_CONTRASENA),
    ultimaPruebaEn: null,
    ultimaPruebaResultado: null,
    actualizadoEn: new Date(),
  };
});

describe('rotación de la llave de secretos', () => {
  it('A, luego A+B (vuelve a cifrar con B) y al fin solo B sigue enviando', async () => {
    cola.pendientes = [correoPorEnviar({ id: 'a' })];
    await loteCon(new CifradorAesGcm({ actual: llaveA })).ejecutar();
    expect(repositorio.recifrados).toBe(0);

    cola.pendientes = [correoPorEnviar({ id: 'b' })];
    await loteCon(new CifradorAesGcm({ actual: llaveB, anterior: llaveA })).ejecutar();
    expect(repositorio.recifrados).toBe(1);

    cola.pendientes = [correoPorEnviar({ id: 'c' })];
    await loteCon(new CifradorAesGcm({ actual: llaveB })).ejecutar();

    expect(cola.resoluciones.map((r) => r.resultado)).toEqual(['enviado', 'enviado', 'enviado']);
    expect(conexiones.map((c) => c.contrasena)).toEqual(['secreta', 'secreta', 'secreta']);
    expect(registro.errores).toEqual([]);
  });

  it('si quitaron la llave anterior sin rotar, el correo espera y el motivo queda en el registro', async () => {
    cola.pendientes = [correoPorEnviar({ id: 'a' })];

    await loteCon(new CifradorAesGcm({ actual: llaveB })).ejecutar();

    expect(cola.resoluciones.map((r) => r.resultado)).toEqual(['sin_servidor']);
    expect(registro.errores).toEqual(['No hay transporte de correo disponible']);
  });
});
