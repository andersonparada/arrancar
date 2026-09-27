import type { AltaCuenta, EstadoModulo, ResultadoAltaCuenta } from '../../servicios/plataforma.api';

export interface FormularioDeAlta {
  abierta: boolean;
  nombreCuenta: string;
  empresa: string;
  nit: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  correo: string;
  contrasena: string;
  modulos: string[];
}

export const altaVacia = (): FormularioDeAlta => ({
  abierta: false,
  nombreCuenta: '',
  empresa: '',
  nit: '',
  nombres: '',
  apellidos: '',
  usuario: '',
  correo: '',
  contrasena: '',
  modulos: [],
});

/** Lo opcional que queda vacío no se manda: el servidor genera el usuario si falta. */
export const datosDelAlta = (alta: FormularioDeAlta): AltaCuenta => ({
  nombreCuenta: alta.nombreCuenta,
  empresa: { nombre: alta.empresa, nit: alta.nit || undefined },
  propietario: {
    nombres: alta.nombres,
    apellidos: alta.apellidos,
    usuario: alta.usuario.trim().toLowerCase() || undefined,
    correo: alta.correo || null,
    contrasena: alta.contrasena || undefined,
  },
  modulos: alta.modulos,
});

export const avisoDelAlta = ({ propietario }: ResultadoAltaCuenta) =>
  propietario.existente
    ? `Cuenta creada. "${propietario.usuario}" ya existía y ahora también es propietario de esta cuenta.`
    : `Cuenta creada. El propietario inicia sesión como "${propietario.usuario}".`;

/** Los esenciales vienen con toda cuenta: solo se eligen los demás. */
export const modulosContratables = (catalogo: EstadoModulo[]) => catalogo.filter((modulo) => !modulo.esencial);

/** "Requiere: Clientes, Empresas" con los nombres de los módulos de los que depende, o nada. */
export function requisitosDe(modulo: EstadoModulo, catalogo: EstadoModulo[]): string {
  const nombreDe = (clave: string) => catalogo.find((otro) => otro.clave === clave)?.nombre ?? clave;
  return modulo.dependeDe.length ? `Requiere: ${modulo.dependeDe.map(nombreDe).join(', ')}.` : '';
}
