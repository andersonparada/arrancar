import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type {
  ControlDePeriodos,
  DatosDeDeclaracion,
  DeclaracionDelPeriodo,
  FormularioDeDeclaracion,
  PeriodoDelLibro,
} from '../../servicios/periodos.api';
import { ESTADOS_DE_PERIODO, EVENTOS_DE_PERIODO, FORMULARIOS } from '../../textos-de-periodos';
import { etiquetaDePeriodo } from '../documentos/filtros-de-documentos';

export type EstadoVisible = keyof typeof ESTADOS_DE_PERIODO;
type Tono = 'campo' | 'trigo' | 'tierra' | 'rojo';

const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** `AAAA-MM` a partir de `AAAA-MM-01` (lo que usan las rutas y la API de detalle). */
export const mesDelPeriodo = (periodo: string): string => periodo.slice(0, 7);

/** «Septiembre de 2026» a partir de `AAAA-MM` o `AAAA-MM-01`. */
export const nombreDelPeriodo = (periodo: string): string => conMayuscula(etiquetaDePeriodo(periodo));

/** Declarado, abierto, o abierto pero sin terminar el mes (todavía no se puede declarar). */
export function estadoVisible(periodo: Pick<PeriodoDelLibro, 'estado' | 'terminado'>): EstadoVisible {
  if (periodo.estado === 'declarado') return 'declarado';
  return periodo.terminado ? 'abierto' : 'sin_terminar';
}

const TONOS: Record<EstadoVisible, Tono> = { declarado: 'campo', abierto: 'trigo', sin_terminar: 'tierra' };

export const textoDelEstado = (periodo: Pick<PeriodoDelLibro, 'estado' | 'terminado'>): string =>
  ESTADOS_DE_PERIODO[estadoVisible(periodo)];

export const tonoDelEstado = (periodo: Pick<PeriodoDelLibro, 'estado' | 'terminado'>): Tono =>
  TONOS[estadoVisible(periodo)];

/** Lo que se puede hacer con un período según lo que dice el servidor; el servidor valida de todos modos. */
export interface AccionesDelPeriodo {
  puedeDeclarar: boolean;
  puedeReabrir: boolean;
  /** Ya se declaró antes: declarar otra vez registra una rectificación. */
  esRectificacion: boolean;
  /** Por qué no se puede declarar, si no se puede. */
  porQueNoDeclarar: string | null;
}

export function accionesDelPeriodo(periodo: PeriodoDelLibro, control: ControlDePeriodos): AccionesDelPeriodo {
  const declarado = periodo.estado === 'declarado';
  const puedeDeclarar = periodo.terminado && (!declarado || !control.encendido);
  let porQueNoDeclarar: string | null = null;
  if (!periodo.terminado) porQueNoDeclarar = 'El mes todavía no termina: solo se declaran meses completos.';
  else if (declarado && control.encendido) {
    porQueNoDeclarar = 'Está declarado y el bloqueo está encendido: reábralo para declarar de nuevo.';
  }
  return {
    puedeDeclarar,
    puedeReabrir: declarado,
    esRectificacion: periodo.ultimaDeclaracion !== null,
    porQueNoDeclarar,
  };
}

/** «SAT-2237 nº 12345, presentado el 05/10/2026», con lo que haya. */
export function textoDelFormulario(declaracion: DeclaracionDelPeriodo): string {
  if (!declaracion.formulario) return '';
  const partes = [declaracion.formulario === 'sin_formulario' ? 'Sin formulario' : declaracion.formulario];
  if (declaracion.numeroDeFormulario) partes.push(`nº ${declaracion.numeroDeFormulario}`);
  const texto = partes.join(' ');
  return declaracion.fechaDePresentacion
    ? `${texto}, presentado el ${formatearFecha(declaracion.fechaDePresentacion)}`
    : texto;
}

export const textoDelEvento = (declaracion: DeclaracionDelPeriodo): string => EVENTOS_DE_PERIODO[declaracion.evento];

/** Lo que se muestra en la tarjeta de un mes: la última declaración y quién la hizo. */
export function resumenDeLaUltimaDeclaracion(periodo: PeriodoDelLibro): string | null {
  const ultima = periodo.ultimaDeclaracion;
  if (!ultima) return null;
  const quien = ultima.registradaPor ? ` por ${ultima.registradaPor.nombre}` : '';
  return `${textoDelEvento(ultima)} del ${formatearFecha(ultima.registradaEn)}${quien}`;
}

export function opcionesDeFormulario(): Array<{ valor: FormularioDeDeclaracion | ''; texto: string }> {
  const formularios = (Object.keys(FORMULARIOS) as FormularioDeDeclaracion[]).map((valor) => ({
    valor,
    texto: FORMULARIOS[valor],
  }));
  return [{ valor: '', texto: 'El que corresponde al régimen' }, ...formularios];
}

/** Lo que el usuario escribe al declarar. */
export interface DeclaracionEnEdicion {
  formulario: FormularioDeDeclaracion | '';
  numero: string;
  fecha: string;
}

export const declaracionVacia = (): DeclaracionEnEdicion => ({ formulario: '', numero: '', fecha: '' });

/** El cuerpo para la API: lo que se dejó vacío no se envía (el servidor propone). */
export function cuerpoDeDeclaracion(edicion: DeclaracionEnEdicion): DatosDeDeclaracion {
  const cuerpo: DatosDeDeclaracion = {};
  if (edicion.formulario) cuerpo.formulario = edicion.formulario;
  if (edicion.numero.trim()) cuerpo.numeroDeFormulario = edicion.numero.trim();
  if (edicion.fecha) cuerpo.fechaDePresentacion = edicion.fecha;
  return cuerpo;
}

/** Lo que va a pasar al declarar, para confirmar con los ojos abiertos. */
export function resumenDeDeclarar(periodo: PeriodoDelLibro, control: ControlDePeriodos, cambios: number): string[] {
  const nombre = nombreDelPeriodo(periodo.periodo);
  const rectifica = periodo.ultimaDeclaracion !== null;
  const lineas = [
    rectifica
      ? `Se registra una rectificación de ${nombre} con el libro de hoy y la diferencia contra la declaración anterior.`
      : `Se declara ${nombre} con el libro tal como está hoy.`,
  ];
  if (rectifica && cambios > 0) lineas.push(`Cambian ${cambios} cifras desde la declaración anterior.`);
  lineas.push(
    control.encendido
      ? 'Queda bloqueado: no se podrán registrar, anular ni eliminar facturas de ese mes sin reabrirlo.'
      : 'El bloqueo está apagado: podrá seguir cambiando el mes, pero tendrá que rectificar.',
  );
  return lineas;
}

/** Lo que va a pasar al reabrir. */
export function resumenDeReabrir(periodo: PeriodoDelLibro, control: ControlDePeriodos): string[] {
  const nombre = nombreDelPeriodo(periodo.periodo);
  return [
    `Se reabre ${nombre}: vuelve a estado abierto.`,
    control.encendido
      ? 'Se podrán registrar, anular y eliminar facturas de ese mes.'
      : 'El bloqueo está apagado, así que el mes ya se podía cambiar.',
    'Al terminar, declárelo de nuevo: se registra como rectificación. Queda guardado quién lo reabrió y por qué.',
  ];
}
