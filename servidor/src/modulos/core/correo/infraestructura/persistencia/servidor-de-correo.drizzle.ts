import type { BaseDatos } from '../../../base-datos/conexion.js';
import { bitacoraSuperacceso } from '../../../bitacora/infraestructura/persistencia/bitacora.tablas.js';
import type { SecretoCifrado } from '../../aplicacion/puertos/cifrador-de-secretos.js';
import type {
  CambioDelServidor,
  EntradaDeSoporte,
  ServidorDeCorreoRepositorio,
  ServidorGuardado,
} from '../../aplicacion/puertos/servidor-de-correo-repositorio.js';
import type { ResultadoDeEnvio } from '../../aplicacion/transporte-de-correo.js';
import { servidorDeCorreo } from './servidor-de-correo.tablas.js';

type Fila = typeof servidorDeCorreo.$inferSelect;

function secretoDe(fila: Fila): SecretoCifrado | null {
  if (!fila.contrasenaCifrada || !fila.iv || fila.versionDeClave === null) return null;
  return { cifrado: fila.contrasenaCifrada, iv: fila.iv, versionDeClave: fila.versionDeClave };
}

function aServidorGuardado(fila: Fila): ServidorGuardado {
  return {
    servidor: fila.servidor,
    puerto: fila.puerto as 465 | 587,
    seguridad: fila.seguridad as ServidorGuardado['seguridad'],
    usuario: fila.usuario,
    remitenteDireccion: fila.remitenteDireccion,
    remitenteNombre: fila.remitenteNombre,
    activo: fila.activo,
    contrasena: secretoDe(fila),
    ultimaPruebaEn: fila.ultimaPruebaEn,
    ultimaPruebaResultado: fila.ultimaPruebaResultado as ResultadoDeEnvio | null,
    actualizadoEn: fila.actualizadoEn,
  };
}

function columnasDelSecreto(secreto: SecretoCifrado | undefined) {
  if (!secreto) return {};
  return { contrasenaCifrada: secreto.cifrado, iv: secreto.iv, versionDeClave: secreto.versionDeClave };
}

/**
 * Sin RLS ni unidad de trabajo por empresa: la tabla es de la instalación y la escribe soporte, que trabaja por
 * encima de las cuentas. Cada escritura y su entrada de `core.bitacora_superacceso` van en la misma transacción.
 * `creado_por` y `actualizado_por` se escriben a mano porque aquí no hay variables de la transacción.
 */
export class ServidorDeCorreoDrizzle implements ServidorDeCorreoRepositorio {
  constructor(private readonly bd: BaseDatos) {}

  async obtener(): Promise<ServidorGuardado | null> {
    const [fila] = await this.bd.select().from(servidorDeCorreo);
    return fila ? aServidorGuardado(fila) : null;
  }

  async guardar({ datos, contrasena }: CambioDelServidor, entrada: EntradaDeSoporte): Promise<void> {
    const cambios = { ...datos, ...columnasDelSecreto(contrasena), actualizadoPor: entrada.usuarioId };
    await this.bd.transaction(async (tx) => {
      // Primero actualiza: un `insert … on conflict` revisa los `check` con la fila propuesta, que no trae la contraseña guardada.
      const actualizadas = await tx
        .update(servidorDeCorreo)
        .set({ ...cambios, actualizadoEn: new Date() })
        .returning({ id: servidorDeCorreo.id });
      if (actualizadas.length === 0)
        await tx.insert(servidorDeCorreo).values({ ...cambios, creadoPor: entrada.usuarioId });
      await tx.insert(bitacoraSuperacceso).values(this.entradaDeBitacora(entrada));
    });
  }

  async registrarPrueba(resultado: ResultadoDeEnvio, entrada: EntradaDeSoporte): Promise<void> {
    await this.bd.transaction(async (tx) => {
      await tx.update(servidorDeCorreo).set({
        ultimaPruebaEn: new Date(),
        ultimaPruebaResultado: resultado,
        actualizadoPor: entrada.usuarioId,
        actualizadoEn: new Date(),
      });
      await tx.insert(bitacoraSuperacceso).values(this.entradaDeBitacora(entrada));
    });
  }

  private entradaDeBitacora(entrada: EntradaDeSoporte) {
    return {
      usuarioId: entrada.usuarioId,
      empresaId: null,
      accion: entrada.accion,
      detalle: entrada.detalle,
      direccionIp: entrada.direccionIp,
    };
  }
}
