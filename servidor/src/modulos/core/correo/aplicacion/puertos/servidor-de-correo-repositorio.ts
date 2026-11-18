import type { DatosDelServidor } from '../../dominio/servidor-de-correo.js';
import type { ResultadoDeEnvio } from '../transporte-de-correo.js';
import type { SecretoCifrado } from './cifrador-de-secretos.js';

/** Lo que se guarda del servidor de correo, con la contraseña cifrada (nunca sale de la aplicación). */
export interface ServidorGuardado extends DatosDelServidor {
  readonly contrasena: SecretoCifrado | null;
  readonly ultimaPruebaEn: Date | null;
  readonly ultimaPruebaResultado: ResultadoDeEnvio | null;
  readonly actualizadoEn: Date;
}

/** Quién hace el cambio y desde dónde: queda en la bitácora de superacceso, en la misma transacción. */
export interface EntradaDeSoporte {
  readonly usuarioId: string;
  readonly direccionIp: string | null;
  readonly accion: 'correo.servidor.guardar' | 'correo.servidor.probar';
  /** Sin la contraseña, cifrada o no. */
  readonly detalle: Record<string, unknown>;
}

export interface CambioDelServidor {
  readonly datos: DatosDelServidor;
  /** `undefined` conserva la contraseña guardada. */
  readonly contrasena?: SecretoCifrado;
}

/** Guarda la única fila de `core.servidor_de_correo`. Es de la instalación: sin empresa ni cuenta. */
export interface ServidorDeCorreoRepositorio {
  obtener(): Promise<ServidorGuardado | null>;
  /** Crea o reemplaza el servidor y deja la entrada de bitácora en la misma transacción. */
  guardar(cambio: CambioDelServidor, entrada: EntradaDeSoporte): Promise<void>;
  /** Anota el resultado de la última prueba y deja la entrada de bitácora en la misma transacción. */
  registrarPrueba(resultado: ResultadoDeEnvio, entrada: EntradaDeSoporte): Promise<void>;
}
