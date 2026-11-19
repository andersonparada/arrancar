import type { CambiosDeMoneda, Moneda, OpcionDelBanguat } from '../../servicios/monedas.api';
import type { OpcionBuscable } from '../../utilidades/busqueda-de-opciones';
import { textoDeEdicion, textoONulo } from '../../utilidades/edicion';
import { textoDeLaConvencion } from './convenciones-del-banguat';

/** La moneda en la ventana de edición: lo original (para saber qué cambió) y lo que se va editando. */
export interface FormularioDeMoneda {
  abierta: boolean;
  moneda: Moneda | null;
  activa: boolean;
  codigoBanguat: number | null;
  letrasSingular: string;
  letrasPlural: string;
}

const DECIMALES_PARA_ACTIVAR = 2;
const MONEDA_BASE = 'GTQ';

export const formularioDeMonedaVacio = (): FormularioDeMoneda => ({
  abierta: false,
  moneda: null,
  activa: false,
  codigoBanguat: null,
  letrasSingular: '',
  letrasPlural: '',
});

/** El formulario de una moneda ya guardada. */
export const formularioDeMoneda = (moneda: Moneda): FormularioDeMoneda => ({
  abierta: true,
  moneda,
  activa: moneda.activa,
  codigoBanguat: moneda.codigoBanguat,
  letrasSingular: textoDeEdicion(moneda.letrasSingular),
  letrasPlural: textoDeEdicion(moneda.letrasPlural),
});

/**
 * Por qué el interruptor «Activa» no se puede mover, o `null` si se puede. El quetzal siempre está activo y, en esta
 * versión, solo se activan monedas de dos decimales (todo el dinero se guarda con dos).
 */
export function motivoSinCambiarActiva(moneda: Moneda): string | null {
  if (moneda.codigo === MONEDA_BASE) return 'El quetzal es la moneda de los libros: siempre está activo.';
  if (moneda.activa || moneda.decimales === DECIMALES_PARA_ACTIVAR) return null;
  return `${moneda.codigo} lleva ${moneda.decimales} decimales; por ahora solo se activan monedas de dos decimales.`;
}

/** El quetzal no tiene tipo de cambio: no lleva código del Banguat. */
export const admiteCodigoDelBanguat = (moneda: Moneda): boolean => moneda.codigo !== MONEDA_BASE;

/** «Euro (24) · USD por unidad»; sin la convención si aún no se comprobó. */
const textoDeLaOpcion = (opcion: OpcionDelBanguat) => {
  const convencion = textoDeLaConvencion(opcion.convencion);
  return `${opcion.descripcion} (${opcion.codigo})${convencion ? ` · ${convencion}` : ''}`;
};

/** Por qué una opción no se puede elegir para esta moneda, o `null` si se puede. */
function motivoDeBloqueo(opcion: OpcionDelBanguat, moneda: Moneda): string | null {
  if (opcion.codigo === moneda.codigoBanguat) return null;
  if (moneda.tieneSerieDelBanguat) return 'ya tiene tipos cargados con otro código';
  return opcion.asignadaA && opcion.asignadaA !== moneda.codigo ? `ya es de ${opcion.asignadaA}` : null;
}

/** Solo se ofrecen las que el servidor marca `ofrecida`; la que ya tiene la moneda se ve siempre, marcada. */
function seOfrece(opcion: OpcionDelBanguat, moneda: Moneda): boolean {
  return opcion.codigo === moneda.codigoBanguat || opcion.ofrecida;
}

function opcionDeLaLista(opcion: OpcionDelBanguat, moneda: Moneda): OpcionBuscable<number | null> {
  const marca = !opcion.disponible ? ' · ya no disponible' : opcion.ofrecida ? '' : ' · no se ofrece';
  const bloqueo = motivoDeBloqueo(opcion, moneda);
  return {
    valor: opcion.codigo,
    texto: `${textoDeLaOpcion(opcion)}${marca}${bloqueo ? `, ${bloqueo}` : ''}`,
    deshabilitada: bloqueo !== null,
  };
}

/**
 * Las opciones del selector «Moneda del Banguat», ordenadas por nombre y con «Sin código» primero. Las de otra moneda
 * y, si ya hay tipos cargados, todas menos la propia, se ven deshabilitadas con su porqué.
 */
export function opcionesDelBanguat(lista: OpcionDelBanguat[], moneda: Moneda): OpcionBuscable<number | null>[] {
  const ofrecidas = lista
    .filter((opcion) => seOfrece(opcion, moneda))
    .sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es'))
    .map((opcion) => opcionDeLaLista(opcion, moneda));
  return [{ valor: null, texto: 'Sin código: no se carga' }, ...ofrecidas];
}

/** El texto de ayuda bajo el selector. */
export function ayudaDelCodigo(form: FormularioDeMoneda): string {
  if (form.moneda?.tieneSerieDelBanguat)
    return 'Ya tiene tipos cargados con este código: solo puede dejarlo igual o quitarlo.';
  return 'Antes de guardar, «Ver muestra» trae lo publicado en los últimos 7 días y lo que da en quetzales: un euro ronda Q 8 a 9 por unidad.';
}

/** Qué pasará con la carga automática al guardar: lo que ve soporte antes de decidir. */
export function avisoDeCarga(form: FormularioDeMoneda): string | null {
  if (!form.moneda || !admiteCodigoDelBanguat(form.moneda)) return null;
  if (form.activa && form.codigoBanguat !== null)
    return 'Activa y con código: su tipo de cambio se carga cada noche y, al guardar, se piden sus últimos 45 días.';
  if (form.codigoBanguat !== null) return 'Tiene código pero está inactiva: no se carga hasta que se active.';
  if (form.activa) return 'Activa sin código: sus tipos de cambio hay que ingresarlos a mano.';
  return null;
}

/** Las letras del monto van las dos o ninguna; el servidor lo exige igual. */
export function erroresDelFormulario(form: FormularioDeMoneda): Record<string, string> {
  const singular = textoONulo(form.letrasSingular);
  const plural = textoONulo(form.letrasPlural);
  if (singular && !plural) return { letrasPlural: 'Escriba también las letras del plural, o deje las dos vacías.' };
  if (plural && !singular) return { letrasSingular: 'Escriba también las letras del singular, o deje las dos vacías.' };
  return {};
}

/** Solo lo que cambió (un guardado sin cambios no manda nada). */
export function cambiosDeLaMoneda(form: FormularioDeMoneda): CambiosDeMoneda {
  const { moneda } = form;
  if (!moneda) return {};
  const cambios: CambiosDeMoneda = {};
  if (form.activa !== moneda.activa) cambios.activa = form.activa;
  if (form.codigoBanguat !== moneda.codigoBanguat) cambios.codigoBanguat = form.codigoBanguat;
  const singular = textoONulo(form.letrasSingular);
  const plural = textoONulo(form.letrasPlural);
  const original = [textoONulo(moneda.letrasSingular), textoONulo(moneda.letrasPlural)];
  if (singular !== original[0] || plural !== original[1])
    Object.assign(cambios, { letrasSingular: singular, letrasPlural: plural });
  return cambios;
}

export interface ConfirmacionDeMoneda {
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
}

/**
 * Lo que pide confirmación al guardar: desactivar la moneda y quitar o cambiar su código (la moneda deja de
 * cargarse). Cada frase dice qué va a pasar; si no hay nada así, `null`.
 */
export function confirmacionDeGuardar(form: FormularioDeMoneda, cambios: CambiosDeMoneda): ConfirmacionDeMoneda | null {
  const { moneda } = form;
  if (!moneda) return null;
  const frases: string[] = [];
  if (cambios.activa === false)
    frases.push(`${moneda.codigo} dejará de ofrecerse en las operaciones nuevas y de cargarse cada noche.`);
  if (moneda.codigoBanguat !== null && cambios.codigoBanguat !== undefined)
    frases.push(
      cambios.codigoBanguat === null
        ? `Se le quita el código ${moneda.codigoBanguat} del Banguat: dejará de cargar su tipo de cambio.`
        : `Su código del Banguat pasa de ${moneda.codigoBanguat} a ${cambios.codigoBanguat}.`,
    );
  if (frases.length === 0) return null;
  const mensaje = `${frases.join(' ')} Lo ya registrado se conserva y queda en la auditoría.`;
  return { titulo: `Guardar cambios de ${moneda.codigo}`, mensaje, textoConfirmar: 'Guardar' };
}
