import type { Clase, DatosClase } from '../../servicios/clases.api';
import type { EdicionDeClase } from './edicion-de-clase';

/** Los terrenos no se deprecian: el porcentaje es 0 y no llevan vida útil (el servidor lo exige igual). */
export const esTerreno = (inciso: EdicionDeClase['incisoFiscal']): boolean => inciso === 'terrenos';

/** Al elegir «Terrenos» deja el porcentaje en 0 y quita la vida útil, para que no haya que corregirlos a mano. */
export function aplicarInciso(edicion: EdicionDeClase): void {
  if (!esTerreno(edicion.incisoFiscal)) return;
  edicion.porcentajeFiscal = '0';
  edicion.vidaUtilContableMeses = '';
}

const NOMBRE_DE_PROGRAMAS = 'programas y licencias';

/** Quita tildes y mayúsculas para comparar nombres. */
const normalizar = (nombre: string): string =>
  nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

/** La ayuda de «Programas y licencias» (dictamen V-2); las demás clases no llevan. */
export const AYUDA_DE_PROGRAMAS_Y_LICENCIAS =
  'Solo licencias compradas aparte. El programa incluido en el equipo es parte del equipo; las suscripciones son gasto.';

export const ayudaDeClase = (nombre: string): string | undefined =>
  normalizar(nombre) === normalizar(NOMBRE_DE_PROGRAMAS) ? AYUDA_DE_PROGRAMAS_Y_LICENCIAS : undefined;

/** Lo que se manda al servidor para inactivar o reactivar: la misma clase con `activo` invertido. */
export const datosParaCambiarEstado = (clase: Clase): DatosClase => {
  const { id: _id, ...datos } = clase;
  return { ...datos, activo: !clase.activo };
};

/** La pregunta antes de inactivar o reactivar. */
export const mensajeDeCambioDeEstado = (clase: Clase): string =>
  clase.activo
    ? `¿Inactivar la clase «${clase.nombre}»? Dejará de ofrecerse al registrar activos, pero los activos que ya la usan se conservan.`
    : `¿Reactivar la clase «${clase.nombre}»? Volverá a ofrecerse al registrar activos.`;

/** La pregunta antes de eliminar. */
export const mensajeDeEliminacion = (clase: Clase): string =>
  `¿Eliminar la clase «${clase.nombre}»? Solo se puede si no tiene activos ni conceptos de gasto ligados; si ya se usó, inactívela. Queda en la auditoría.`;

/** Orden alfabético por nombre. */
export const ordenarPorNombre = (clases: Clase[]): Clase[] =>
  [...clases].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
