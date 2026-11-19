import type {
  DatosDelServidorDeCorreo,
  EstadoDelCorreo,
  ResultadoDelEnvio,
  ServidorDeCorreo,
} from '../../servicios/correo-de-soporte.api';
import type { OpcionBuscable } from '../../utilidades/busqueda-de-opciones';

/** El puerto decide el cifrado: el 587 usa STARTTLS y el 465, TLS directo. No hay conexiones sin cifrar. */
export const OPCIONES_DE_PUERTO: OpcionBuscable<number>[] = [
  { valor: 587, texto: 'Puerto 587 con STARTTLS (recomendado)' },
  { valor: 465, texto: 'Puerto 465 con TLS directo' },
];

export interface BorradorDelServidor {
  servidor: string;
  puerto: number;
  usuario: string;
  /** Vacía = conservar la que ya está guardada. */
  contrasena: string;
  remitenteDireccion: string;
  remitenteNombre: string;
  activo: boolean;
}

/** El borrador que se edita, a partir de lo guardado; la contraseña empieza vacía (nunca llega del servidor). */
export function borradorDe(guardado: ServidorDeCorreo, nombreDeLaAplicacion: string): BorradorDelServidor {
  return {
    servidor: guardado.servidor,
    puerto: guardado.puerto,
    usuario: guardado.usuario,
    contrasena: '',
    remitenteDireccion: guardado.remitenteDireccion,
    remitenteNombre: guardado.remitenteNombre || nombreDeLaAplicacion,
    activo: guardado.activo,
  };
}

/** Lo que se manda al guardar: la seguridad sale del puerto y la contraseña solo va si se escribió una nueva. */
export function datosParaGuardar(borrador: BorradorDelServidor): DatosDelServidorDeCorreo {
  const { contrasena, ...resto } = borrador;
  return {
    ...resto,
    servidor: borrador.servidor.trim(),
    usuario: borrador.usuario.trim(),
    remitenteDireccion: borrador.remitenteDireccion.trim(),
    remitenteNombre: borrador.remitenteNombre.trim(),
    seguridad: borrador.puerto === 465 ? 'tls_directo' : 'starttls',
    ...(contrasena === '' ? {} : { contrasena }),
  };
}

/** Si el borrador difiere de lo guardado (una contraseña nueva también es un cambio). */
export function hayCambios(borrador: BorradorDelServidor, guardado: ServidorDeCorreo): boolean {
  const base = borradorDe(guardado, borrador.remitenteNombre);
  return (
    borrador.contrasena !== '' ||
    (Object.keys(base) as Array<keyof BorradorDelServidor>).some((campo) => base[campo] !== borrador[campo])
  );
}

/** Para activarlo hace falta una contraseña (la guardada o la que se está escribiendo). */
export function faltaLaContrasena(borrador: BorradorDelServidor, guardado: ServidorDeCorreo): boolean {
  return borrador.activo && borrador.contrasena === '' && !guardado.contrasenaConfigurada;
}

export function textoDelEstadoDelServidor(servidor: ServidorDeCorreo): string {
  if (!servidor.configurado) return 'Sin configurar: los correos esperan en la bandeja.';
  return servidor.activo
    ? 'Activo: los correos salen por este servidor.'
    : 'Apagado: los correos esperan en la bandeja.';
}

const TEXTOS_DE_LA_PRUEBA: Record<ResultadoDelEnvio, string> = {
  enviado: 'El servidor aceptó el correo de prueba.',
  temporal: 'No se pudo conectar con el servidor o tardó demasiado. Revise el nombre, el puerto y la red.',
  permanente: 'El servidor rechazó el correo de prueba. Revise el remitente y que el dominio esté autorizado.',
  autenticacion: 'El servidor rechazó el usuario o la contraseña, o no ofreció un cifrado válido.',
};

export const textoDeLaPrueba = (resultado: ResultadoDelEnvio): string => TEXTOS_DE_LA_PRUEBA[resultado];

export const NOMBRES_DE_ESTADO: Record<EstadoDelCorreo, string> = {
  pendiente: 'Pendientes',
  enviando: 'Enviando',
  enviado: 'Enviados',
  fallido: 'Fallidos',
  cancelado: 'Cancelados',
};

const TIPOS_CONOCIDOS: Record<string, string> = { 'cuentas-por-pagar.aviso_de_pago': 'Aviso de pago' };

/** Cómo se lee el tipo de un correo; uno nuevo sin traducir se muestra con su código. */
export const nombreDelTipoDeCorreo = (tipo: string): string => TIPOS_CONOCIDOS[tipo] ?? tipo;
