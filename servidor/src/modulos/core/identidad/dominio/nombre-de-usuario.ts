import { DatoInvalido } from '../../compartido/dominio/errores.js';
import { ObjetoValor } from '../../compartido/dominio/objeto-valor.js';

/** Solo letras minúsculas, de 3 a 30: fácil de dictar por teléfono. */
export const PATRON_USUARIO = /^[a-z]{3,30}$/;

/** Palabras que no cuentan como nombre ni apellido ("María de los Ángeles", "de León"). */
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'das', 'do', 'dos', 'van', 'von', 'di']);

export class NombreDeUsuarioInvalido extends DatoInvalido {
  readonly codigo = 'nombre_de_usuario_invalido';

  constructor(texto: string) {
    super(`"${texto}" no sirve como usuario: use de 3 a 30 letras, sin números, espacios ni tildes.`);
  }
}

/** Con lo que la persona entra al sistema; es único en todo el servidor. */
export class NombreDeUsuario extends ObjetoValor<string> {
  private constructor(valor: string) {
    super(valor);
  }

  static crear(texto: string): NombreDeUsuario {
    const normalizado = texto.trim().toLowerCase();
    if (!PATRON_USUARIO.test(normalizado)) throw new NombreDeUsuarioInvalido(texto);
    return new NombreDeUsuario(normalizado);
  }
}

/** Pasa a minúsculas, quita tildes y convierte la ñ en n; deja solo letras. */
function soloLetras(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
}

function palabras(texto: string): string[] {
  return texto
    .split(/\s+/)
    .map(soloLetras)
    .filter((p) => p.length > 0 && !PARTICULAS.has(p));
}

/**
 * Nombres de usuario posibles para una persona, en orden de preferencia:
 * 1. Inicial del primer nombre + primer apellido: Juan López → `jlopez`.
 * 2. Iniciales de los dos nombres + primer apellido + inicial del segundo:
 *    Anderson Magdiel Parada Alvizures → `amparadaa`.
 * 3. Variantes con más letras si las anteriores ya existen.
 * Solo letras, entre 3 y 30 caracteres y sin repetidos.
 */
export function candidatosDeNombreDeUsuario(nombres: string, apellidos: string): string[] {
  const [nombre1 = '', nombre2 = ''] = palabras(nombres);
  const [apellido1 = '', apellido2 = ''] = palabras(apellidos);
  const inicial = (palabra: string) => palabra.slice(0, 1);

  const candidatos = [
    inicial(nombre1) + apellido1,
    inicial(nombre1) + inicial(nombre2) + apellido1 + inicial(apellido2),
    inicial(nombre1) + inicial(nombre2) + apellido1 + apellido2,
    nombre1 + apellido1,
    nombre1 + inicial(nombre2) + apellido1 + inicial(apellido2),
    nombre1 + apellido1 + apellido2,
    nombre1 + nombre2 + apellido1 + apellido2,
  ];

  return [...new Set(candidatos)].filter((c) => PATRON_USUARIO.test(c));
}
