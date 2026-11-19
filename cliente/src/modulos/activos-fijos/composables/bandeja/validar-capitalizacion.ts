import type { Activo } from '../../servicios/activos.api';
import type { LineaDeBandeja } from '../../servicios/bandeja.api';
import type { Clase } from '../../servicios/clases.api';
import type { EdicionDeAsignacion } from './edicion-de-capitalizacion';
import { centavosDeTexto, textoDeCentavos } from './montos-de-bandeja';
import { textoONulo } from '@/modulos/core/utilidades/edicion';
import { formatearMonto } from '@/modulos/core/utilidades/formato';

/** Lo que hace falta saber para revisar una capitalización antes de mandarla. */
export interface ContextoDeRevision {
  lineas: readonly LineaDeBandeja[];
  clases: readonly Clase[];
}

/** El máximo de unidades que crea una operación completa (lo mismo que revisa el servidor). */
export const MAXIMO_DE_UNIDADES = 200;

/** La llave de un error de una parte: `<clave>.<campo>`. */
export const llaveDeError = (clave: number, campo: string): string => `${clave}.${campo}`;

/** Las unidades escritas; `NaN` si no son un entero. */
const unidadesDe = (parte: EdicionDeAsignacion): number => Number(parte.nuevo.unidades);

function errorDelMonto(parte: EdicionDeAsignacion, pendiente: number, yaRepartido: number): string | null {
  const centavos = centavosDeTexto(parte.monto);
  if (centavos === null || centavos <= 0) return 'Escriba un monto mayor que cero, con hasta dos decimales.';
  if (centavos > pendiente - yaRepartido) {
    const cabe = textoDeCentavos(Math.max(0, pendiente - yaRepartido));
    return `Se pasa de lo pendiente de la línea. Para esta parte caben ${formatearMonto(cabe)} como máximo.`;
  }
  return null;
}

/** El monto de cada parte contra lo pendiente de su línea, tomando en cuenta lo que repartieron las partes anteriores. */
function erroresDeMontos(partes: readonly EdicionDeAsignacion[], lineas: readonly LineaDeBandeja[]) {
  const errores: Record<string, string> = {};
  const repartido = new Map<string, number>();
  for (const parte of partes) {
    const linea = lineas.find((candidata) => candidata.lineaId === parte.lineaId);
    const pendiente = Math.abs(centavosDeTexto(linea?.pendiente) ?? 0);
    const antes = repartido.get(parte.lineaId) ?? 0;
    const error = errorDelMonto(parte, pendiente, antes);
    if (error) errores[llaveDeError(parte.clave, 'monto')] = error;
    repartido.set(parte.lineaId, antes + (centavosDeTexto(parte.monto) ?? 0));
  }
  return errores;
}

function errorDeUnidades(parte: EdicionDeAsignacion, restantes: number): string | null {
  const unidades = unidadesDe(parte);
  if (!Number.isInteger(unidades) || unidades < 1) return 'Escriba cuántos activos iguales se crean (1 o más).';
  if (unidades > restantes) return `Esta operación crea como máximo ${MAXIMO_DE_UNIDADES} activos en total.`;
  return null;
}

const DOS_DECIMALES = 'Escriba un valor con hasta dos decimales, por ejemplo 1500.50.';

/** Un valor opcional que, si se escribe, lleva a lo más dos decimales (lo que pide el servidor). */
const decimalInvalido = (valor: string | number): boolean => !!textoONulo(valor) && centavosDeTexto(valor) === null;

/** Valor como ganado común (reproductores) y matrícula y catastro (edificios): a lo más dos decimales. */
function erroresDeValoresFiscales(parte: EdicionDeAsignacion, inciso: Clase['incisoFiscal'] | undefined) {
  const errores: Record<string, string> = {};
  const nuevo = parte.nuevo;
  const poner = (campo: string, mensaje: string) => (errores[llaveDeError(parte.clave, campo)] = mensaje);
  if (inciso === 'reproductores') {
    if (!textoONulo(nuevo.valorComoGanadoComun)) poner('valorComoGanadoComun', 'Escriba el valor como ganado común.');
    else if (decimalInvalido(nuevo.valorComoGanadoComun)) poner('valorComoGanadoComun', DOS_DECIMALES);
  }
  if (inciso === 'edificios') {
    if (decimalInvalido(nuevo.valorDeMatricula)) poner('valorDeMatricula', DOS_DECIMALES);
    if (decimalInvalido(nuevo.valorCatastral)) poner('valorCatastral', DOS_DECIMALES);
  }
  return errores;
}

/** La cantidad por activo y los valores propios del inciso fiscal. */
function erroresDeCantidadYValores(parte: EdicionDeAsignacion, clases: readonly Clase[]) {
  const cantidad = Number(parte.nuevo.cantidadPorActivo);
  const errores = erroresDeValoresFiscales(
    parte,
    clases.find((clase) => clase.id === parte.nuevo.claseId)?.incisoFiscal,
  );
  if (!Number.isInteger(cantidad) || cantidad < 1)
    errores[llaveDeError(parte.clave, 'cantidadPorActivo')] = 'Escriba cuántas piezas lleva cada activo (1 o más).';
  return errores;
}

function erroresDelActivoNuevo(parte: EdicionDeAsignacion, restantes: number, clases: readonly Clase[]) {
  const errores = erroresDeCantidadYValores(parte, clases);
  const nuevo = parte.nuevo;
  if (!nuevo.descripcion.trim()) errores[llaveDeError(parte.clave, 'descripcion')] = 'Escriba qué es el activo.';
  if (!nuevo.claseId) errores[llaveDeError(parte.clave, 'claseId')] = 'Elija la clase del activo.';
  const deUnidades = errorDeUnidades(parte, restantes);
  if (deUnidades) errores[llaveDeError(parte.clave, 'unidades')] = deUnidades;
  return errores;
}

function erroresDelDestino(parte: EdicionDeAsignacion) {
  const errores: Record<string, string> = {};
  if (parte.destino === 'existente' && !parte.activoId)
    errores[llaveDeError(parte.clave, 'activoId')] = 'Elija el activo que recibe este costo.';
  if (parte.destino === 'conjunta' && !parte.altaConjuntaId)
    errores[llaveDeError(parte.clave, 'altaConjuntaId')] = 'Elija la compra conjunta que recibe este costo.';
  return errores;
}

/**
 * Lo que está mal en las partes, por campo: `<clave>.<campo>`. El servidor vuelve a revisar todo; esto solo
 * ahorra el viaje y dice en el campo cómo corregirlo.
 */
export function erroresDeCapitalizacion(
  partes: readonly EdicionDeAsignacion[],
  contexto: ContextoDeRevision,
): Record<string, string> {
  let restantes = MAXIMO_DE_UNIDADES;
  const errores = erroresDeMontos(partes, contexto.lineas);
  for (const parte of partes) {
    Object.assign(errores, erroresDelDestino(parte));
    if (parte.destino !== 'nuevo') continue;
    Object.assign(errores, erroresDelActivoNuevo(parte, restantes, contexto.clases));
    restantes -= Number.isInteger(unidadesDe(parte)) ? unidadesDe(parte) : 0;
  }
  return errores;
}

/** Los errores de una parte, con el campo como llave (sin el `<clave>.` del principio). */
export function erroresDeLaParte(errores: Record<string, string>, clave: number): Record<string, string> {
  const prefijo = `${clave}.`;
  return Object.fromEntries(
    Object.entries(errores)
      .filter(([llave]) => llave.startsWith(prefijo))
      .map(([llave, mensaje]) => [llave.slice(prefijo.length), mensaje]),
  );
}

/** Un renglón de la cuadrícula que el servidor rechazó: la asignación (su posición) y la unidad dentro de ella. */
export interface RenglonRechazado {
  asignacion: number;
  renglon: number;
  causa: 'repetido_en_la_cuadricula' | 'ya_usado_por_otro_activo';
}

const MENSAJE_DE_CODIGO: Record<RenglonRechazado['causa'], string> = {
  repetido_en_la_cuadricula: 'Este código se repite en la cuadrícula. Cámbielo.',
  ya_usado_por_otro_activo: 'Otro activo ya usa este código. Cámbielo o déjelo vacío para que se proponga uno.',
};

/** Los errores por renglón (`<clave>.renglon.<n>`) que el servidor señaló al revisar los códigos. */
export function erroresDeRenglones(
  rechazados: readonly RenglonRechazado[],
  partes: readonly EdicionDeAsignacion[],
): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const { asignacion, renglon, causa } of rechazados) {
    const parte = partes[asignacion];
    if (parte) errores[llaveDeError(parte.clave, `renglon.${renglon}`)] = MENSAJE_DE_CODIGO[causa];
  }
  return errores;
}

/** Cuántos activos nuevos crea la operación completa, para el resumen. */
export const unidadesAcrear = (partes: readonly EdicionDeAsignacion[]): number =>
  partes
    .filter((parte) => parte.destino === 'nuevo')
    .reduce((suma, parte) => suma + (Number.isInteger(unidadesDe(parte)) ? unidadesDe(parte) : 0), 0);

/** Los activos que se pueden elegir como destino: no dados de baja ni de terceros (que no llevan costos). */
export const activosQueRecibenCostos = (activos: readonly Activo[]): Activo[] =>
  activos.filter((activo) => activo.estado !== 'dado_de_baja' && activo.tipoDeRegistro !== 'de_terceros');
