import { randomBytes } from 'node:crypto';
import { beforeAll, beforeEach } from 'vitest';
import { bd } from '../../base-datos/conexion.js';
import { GestorDeDocumentos } from '../../archivos/aplicacion/gestor-de-documentos.js';
import type { InspectorDePdf } from '../../archivos/aplicacion/puertos/inspector-de-pdf.js';
import { RepositorioArchivosDrizzle } from '../../archivos/infraestructura/persistencia/repositorio-archivos.drizzle.js';
import { OptimizadorFalso } from '../../archivos/pruebas/dobles-de-archivos.js';
import type { Operador } from '../../compartido/aplicacion/operador.js';
import { TareasDeLaTransaccionPostgres } from '../../compartido/infraestructura/tareas-de-la-transaccion-postgres.js';
import { UnidadDeTrabajoPostgres } from '../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { AlmacenamientoEnMemoria } from '../../compartido/pruebas/dobles-compartidos.js';
import { CONTEXTO_DE_LA_CONTRASENA } from '../aplicacion/contexto-de-la-contrasena.js';
import { EncolarCorreo } from '../aplicacion/casos-uso/encolar-correo.js';
import { EnviarLoteDeCorreos } from '../aplicacion/casos-uso/enviar-lote-de-correos.js';
import { ProveedorDeTransporte } from '../aplicacion/proveedor-de-transporte.js';
import type { MensajePorEncolar } from '../aplicacion/bandeja-de-salida.js';
import { CifradorAesGcm } from '../infraestructura/cifrador-aes-gcm.js';
import { ColaDeEnvioDrizzle } from '../infraestructura/persistencia/cola-de-envio.drizzle.js';
import { RepositorioDeCorreosDrizzle } from '../infraestructura/persistencia/repositorio-de-correos.drizzle.js';
import { ServidorDeCorreoDrizzle } from '../infraestructura/persistencia/servidor-de-correo.drizzle.js';
import { TransporteEnMemoria } from '../infraestructura/transporte-en-memoria.js';
import type { TopesDeCorreo } from '../dominio/cupos-de-correo.js';
import { ParametrosFijos, RegistroEnMemoria, TOPES_DE_PRUEBA } from './dobles-de-la-bandeja.js';
import { prepararBandeja, type BandejaDePrueba } from './bandeja.soporte.js';

export type OperadorDePrueba = Operador;
export type MontajeDeBandeja = ReturnType<typeof armarBandejaCompleta>;

export const PDF = Buffer.from('%PDF-1.7\ncomprobante del pago');

export const MENSAJE: MensajePorEncolar = {
  tipo: 'prueba.aviso_de_pago',
  origen: { recurso: 'prueba.pagos', registroId: '5b1f6f0e-8d52-4a37-9d54-0c8f3c2a7b11' },
  empresa: 'Rancho Los Pinos',
  responderA: 'empresa@ejemplo.com',
  destinatarios: [
    { direccion: 'proveedor@ejemplo.com', nombre: 'Proveedor', clase: 'para', origen: 'contacto', origenId: null },
    { direccion: 'empresa@ejemplo.com', nombre: null, clase: 'copia', origen: 'empresa', origenId: null },
  ],
  plantilla: {
    asunto: 'Aviso de pago {numero}',
    mensaje: 'Estimado {proveedor}: pago {numero}.',
    marcadoresDelAsunto: ['numero'],
    marcadoresDelMensaje: ['numero', 'proveedor'],
    valores: { numero: '12', proveedor: 'Proveedor' },
  },
  adjunto: { nombre: 'comprobante-de-pago-12', contenido: PDF },
};

class InspectorQueAcepta implements InspectorDePdf {
  async inspeccionar(contenido: Buffer) {
    return { contenido, paginas: 1 };
  }
}

/** Todo armado con piezas reales (base de datos, unidad de trabajo, funciones) y los dobles de afuera (disco y SMTP). */
export function armarBandejaCompleta(topes: TopesDeCorreo = TOPES_DE_PRUEBA) {
  const almacenamiento = new AlmacenamientoEnMemoria();
  const unidadDeTrabajo = new UnidadDeTrabajoPostgres(bd);
  const documentos = new GestorDeDocumentos({
    repositorio: new RepositorioArchivosDrizzle(),
    almacenamiento,
    optimizador: new OptimizadorFalso(),
    inspector: new InspectorQueAcepta(),
    tareas: new TareasDeLaTransaccionPostgres(),
  });
  const despertares = { cuenta: 0 };
  const encolar = new EncolarCorreo({
    repositorio: new RepositorioDeCorreosDrizzle(),
    documentos,
    parametros: new ParametrosFijos(topes),
    tareas: new TareasDeLaTransaccionPostgres(),
    despertador: { despertar: () => (despertares.cuenta += 1) },
    dominioDeMensajes: 'arrancar.test',
  });
  const transporte = new TransporteEnMemoria();
  const registro = new RegistroEnMemoria();
  const cifrador = new CifradorAesGcm({ actual: randomBytes(32).toString('base64') });
  const servidor = new ServidorDeCorreoDrizzle(bd);
  const proveedor = new ProveedorDeTransporte({
    repositorio: servidor,
    cifrador,
    fabrica: { crear: () => transporte },
  });
  const cola = new ColaDeEnvioDrizzle(bd);
  const lote = new EnviarLoteDeCorreos({ cola, proveedor, almacenamiento, registro });
  return {
    almacenamiento,
    unidadDeTrabajo,
    encolar,
    despertares,
    transporte,
    registro,
    cifrador,
    servidor,
    cola,
    lote,
  };
}

/** Guarda en la base un servidor activo, con la contraseña cifrada de verdad. */
export async function activarServidor(bandeja: ReturnType<typeof armarBandejaCompleta>, usuarioId: string) {
  await bandeja.servidor.guardar(
    {
      datos: {
        servidor: 'smtp.proveedor.com',
        puerto: 587,
        seguridad: 'starttls',
        usuario: 'apikey',
        remitenteDireccion: 'notificaciones@ejemplo.com',
        remitenteNombre: 'Arrancar',
        activo: true,
      },
      contrasena: bandeja.cifrador.cifrar('secreta', CONTEXTO_DE_LA_CONTRASENA),
    },
    { usuarioId, direccionIp: null, accion: 'correo.servidor.guardar', detalle: {} },
  );
}

/** Lo que comparten las pruebas de la bandeja completa: la base, un usuario real y un montaje nuevo por prueba. */
export interface BandejaCompleta extends BandejaDePrueba {
  operador: OperadorDePrueba;
  montaje: MontajeDeBandeja;
  operadorDe(empresaId: string, cuentaId: string): OperadorDePrueba;
  filas(consulta: string, parametros?: unknown[]): Promise<any[]>;
}

/** Registra los `beforeAll` y `beforeEach` de la bandeja completa y devuelve sus piezas, que se llenan al correr. */
export function usarBandejaCompleta(): BandejaCompleta {
  const bandeja = prepararBandeja() as BandejaCompleta;
  let usuarioId = '';
  bandeja.operadorDe = (empresaId, cuentaId) => ({ empresaId, cuentaId, usuarioId, esSuperacceso: false });
  bandeja.filas = async (consulta, parametros = []) => (await bandeja.propietario.query(consulta, parametros)).rows;
  beforeAll(async () => {
    const [usuario] = await bandeja.filas(
      `insert into core.usuarios (usuario, nombres, hash_contrasena) values ('correos', 'Correos', 'x') returning id`,
    );
    usuarioId = usuario!.id;
    bandeja.operador = bandeja.operadorDe(bandeja.escenario.empresaA1, bandeja.escenario.cuentaA);
  });
  beforeEach(async () => {
    await bandeja.propietario.query('truncate core.correos_salientes, core.archivos cascade');
    await bandeja.propietario.query('delete from core.servidor_de_correo');
    bandeja.montaje = armarBandejaCompleta();
    await activarServidor(bandeja.montaje, usuarioId);
  });
  return bandeja;
}
