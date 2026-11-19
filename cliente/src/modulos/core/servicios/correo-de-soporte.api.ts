import { clienteHttp, type ClienteHttp } from './cliente-http';

export type ResultadoDelEnvio = 'enviado' | 'temporal' | 'permanente' | 'autenticacion';
export type EstadoDelCorreo = 'pendiente' | 'enviando' | 'enviado' | 'fallido' | 'cancelado';

/** El servidor de correo de la instalación. Nunca trae la contraseña: solo si hay una. */
export interface ServidorDeCorreo {
  configurado: boolean;
  servidor: string;
  puerto: number;
  seguridad: 'tls_directo' | 'starttls';
  usuario: string;
  remitenteDireccion: string;
  remitenteNombre: string;
  activo: boolean;
  contrasenaConfigurada: boolean;
  /** Falso si falta `CLAVE_SECRETOS` en el servidor: no se puede guardar la contraseña. */
  llaveDisponible: boolean;
  ultimaPrueba: { en: string; resultado: ResultadoDelEnvio } | null;
}

/** Lo que se guarda; `contrasena` solo viaja si se escribió una nueva. */
export interface DatosDelServidorDeCorreo {
  servidor: string;
  puerto: number;
  seguridad: 'tls_directo' | 'starttls';
  usuario: string;
  contrasena?: string;
  remitenteDireccion: string;
  remitenteNombre: string;
  activo: boolean;
}

export interface CorreoFallido {
  id: string;
  empresa: string;
  tipo: string;
  codigo: string | null;
  intentos: number;
  creadoEn: string;
  contenidoDepurado: boolean;
}

export interface BandejaDeSoporte {
  conteos: Record<EstadoDelCorreo, number>;
  pendienteMasAntiguoDesde: string | null;
  fallidosRecientes: CorreoFallido[];
}

/** Soporte → Correo: el servidor SMTP de la instalación, la prueba de envío y el estado de la bandeja. */
export class ApiCorreoDeSoporte {
  constructor(private readonly http: ClienteHttp) {}

  servidor() {
    return this.http.obtener<ServidorDeCorreo>('/soporte/correo/servidor');
  }

  guardarServidor(datos: DatosDelServidorDeCorreo) {
    return this.http.reemplazar<ServidorDeCorreo>('/soporte/correo/servidor', datos);
  }

  probar(destino: string) {
    return this.http.crear<{ resultado: ResultadoDelEnvio; codigo: string | null }>('/soporte/correo/prueba', {
      destino,
    });
  }

  bandeja() {
    return this.http.obtener<BandejaDeSoporte>('/soporte/correo/bandeja');
  }
}

export const apiCorreoDeSoporte = new ApiCorreoDeSoporte(clienteHttp);
