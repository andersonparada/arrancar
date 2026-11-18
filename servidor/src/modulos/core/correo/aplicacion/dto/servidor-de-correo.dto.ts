import type { ServidorGuardado } from '../puertos/servidor-de-correo-repositorio.js';
import type { ResultadoDeEnvio } from '../transporte-de-correo.js';

/**
 * El servidor de correo para el panel de Soporte. **Nunca** lleva la contraseña, ni cifrada ni su largo
 * (C1, C2): solo si hay una.
 */
export interface ServidorDeCorreoDto {
  configurado: boolean;
  servidor: string;
  puerto: number;
  seguridad: string;
  usuario: string;
  remitenteDireccion: string;
  remitenteNombre: string;
  activo: boolean;
  contrasenaConfigurada: boolean;
  /** Falso si falta `CLAVE_SECRETOS` en el entorno: no se puede guardar la contraseña. */
  llaveDisponible: boolean;
  ultimaPrueba: { en: string; resultado: ResultadoDeEnvio } | null;
}

export interface ResultadoDePruebaDto {
  resultado: ResultadoDeEnvio;
  codigo: string | null;
}

const VACIO: ServidorDeCorreoDto = {
  configurado: false,
  servidor: '',
  puerto: 587,
  seguridad: 'starttls',
  usuario: '',
  remitenteDireccion: '',
  remitenteNombre: '',
  activo: false,
  contrasenaConfigurada: false,
  llaveDisponible: false,
  ultimaPrueba: null,
};

function ultimaPruebaDe(guardado: ServidorGuardado): ServidorDeCorreoDto['ultimaPrueba'] {
  if (!guardado.ultimaPruebaEn || !guardado.ultimaPruebaResultado) return null;
  return { en: guardado.ultimaPruebaEn.toISOString(), resultado: guardado.ultimaPruebaResultado };
}

/** Arma el DTO sin copiar ningún campo secreto: se enumeran uno por uno a propósito. */
export function aDtoDelServidor(guardado: ServidorGuardado | null, llaveDisponible: boolean): ServidorDeCorreoDto {
  if (!guardado) return { ...VACIO, llaveDisponible };
  return {
    configurado: true,
    servidor: guardado.servidor,
    puerto: guardado.puerto,
    seguridad: guardado.seguridad,
    usuario: guardado.usuario,
    remitenteDireccion: guardado.remitenteDireccion,
    remitenteNombre: guardado.remitenteNombre,
    activo: guardado.activo,
    contrasenaConfigurada: guardado.contrasena !== null,
    llaveDisponible,
    ultimaPrueba: ultimaPruebaDe(guardado),
  };
}
