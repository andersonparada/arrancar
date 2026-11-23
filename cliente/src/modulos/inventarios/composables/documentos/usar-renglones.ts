import { type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { fechaDeHoy } from '../compartido/fechas';
import {
  agregarLeido,
  articuloDeCodigo,
  renglonNuevo,
  sinRenglonesVacios,
  type EdicionDeRenglon,
} from './edicion-de-renglones';
import { lotePropuesto } from './opciones-de-renglon';
import type { CatalogoDeRenglones } from './usar-catalogo-de-renglones';

const sinArticuloConCodigo = (leido: string): string =>
  `No hay un artículo activo con el código «${leido.trim()}». Revise el código o elíjalo de la lista.`;

/** El lote que tenía el renglón y el que puso el sistema la última vez (si lo hubo). */
interface LoteAnterior {
  anterior: string | null;
  propuesto: string | null | undefined;
  respetarElegido: boolean;
}

/** Un lote elegido a mano (no el propuesto) se conserva si tiene existencia en la bodega o si no se puede saber. */
function seConservaElElegido(previo: LoteAnterior, { puedeVer, conExistencia }: ExistenciasDelRenglon) {
  const { anterior, propuesto, respetarElegido } = previo;
  const aMano = respetarElegido && anterior !== null && anterior !== propuesto;
  return { aMano, conservar: aMano && (!puedeVer || conExistencia.has(anterior!)) };
}

const sinExistenciaEnLaBodega = (nuevo: string | null): string =>
  `El lote que eligió no tiene existencia en la nueva bodega. ${nuevo ? 'Se propuso otro lote' : 'Elija otro lote'}: revise los renglones.`;

/** Lo que los renglones necesitan saber del documento: si es salida (propone lote) y desde qué bodega sale. */
export interface ContextoDeRenglones {
  esSalida: boolean;
  bodegaId: () => string | null;
}

interface ExistenciasDelRenglon {
  puedeVer: boolean;
  conExistencia: ReadonlySet<string>;
}

/** Los lotes con existencia en la bodega del documento para el renglón; `null` si algo cambió mientras se cargaban. */
async function existenciasParaElRenglon(
  renglon: EdicionDeRenglon,
  catalogo: CatalogoDeRenglones,
  contexto: ContextoDeRenglones,
): Promise<ExistenciasDelRenglon | null> {
  const { articuloId } = renglon;
  const bodegaId = contexto.bodegaId();
  const { existenciasDeLotes: existencias } = catalogo;
  await existencias.cargar(articuloId, bodegaId);
  if (renglon.articuloId !== articuloId || bodegaId !== contexto.bodegaId()) return null;
  return { puedeVer: existencias.puedeVer, conExistencia: existencias.conExistencia(articuloId, bodegaId) };
}

/**
 * El lote que se propone en las salidas: el que vence primero y tiene existencia en la bodega; sin bodega o permiso,
 * ninguno. Un lote que el usuario eligió a mano se respeta al cambiar de bodega mientras tenga existencia en la nueva
 * (o no se pueda saber); si ya no tiene, se vuelve a proponer y se avisa.
 */
function usarLotePropuesto(
  renglones: Ref<EdicionDeRenglon[]>,
  catalogo: CatalogoDeRenglones,
  contexto: ContextoDeRenglones,
) {
  const avisos = usarAvisos();
  const propuestos = new Map<number, string | null>();
  async function proponerLote(renglon: EdicionDeRenglon, respetarElegido = false): Promise<void> {
    if (!contexto.esSalida) return;
    const { clave, loteId: anterior } = renglon;
    const existencias = await existenciasParaElRenglon(renglon, catalogo, contexto);
    if (!existencias) return;
    const previo = { anterior, propuesto: propuestos.get(clave), respetarElegido };
    const { aMano, conservar } = seConservaElElegido(previo, existencias);
    if (conservar) return;
    renglon.loteId = lotePropuesto(catalogo.lotesDe(renglon.articuloId), fechaDeHoy(), existencias.conExistencia);
    propuestos.set(clave, renglon.loteId);
    if (aMano) avisos.info(sinExistenciaEnLaBodega(renglon.loteId));
  }

  /** Al cambiar la bodega de la salida, los lotes propuestos se buscan de nuevo y los elegidos a mano se conservan. */
  async function reproponerLotes(): Promise<void> {
    const conArticulo = renglones.value.filter((renglon) => renglon.articuloId);
    await Promise.all(conArticulo.map((renglon) => proponerLote(renglon, true)));
  }

  return { proponerLote, reproponerLotes };
}

/**
 * Un código leído (o escrito) agrega su artículo o suma 1 a su renglón; si no existe, dice cómo seguir. Solo el
 * renglón recién creado se inicializa: los que ya estaban (con su unidad y su lote) no se tocan.
 */
function usarLecturaDeCodigo(
  renglones: Ref<EdicionDeRenglon[]>,
  catalogo: CatalogoDeRenglones,
  alElegirArticulo: (renglon: EdicionDeRenglon) => Promise<void>,
) {
  const avisos = usarAvisos();
  return async (texto: string): Promise<void> => {
    const articulo = articuloDeCodigo(catalogo.articulos.value, texto);
    if (!articulo) return avisos.error(sinArticuloConCodigo(texto));
    const base = sinRenglonesVacios(renglones.value);
    const previos = new Set(base.map((renglon) => renglon.clave));
    renglones.value = agregarLeido(base, articulo.id);
    const nuevo = renglones.value.find((renglon) => !previos.has(renglon.clave));
    if (nuevo) await alElegirArticulo(nuevo);
  };
}

/**
 * Las acciones sobre los renglones de un documento: agregar, quitar, elegir artículo (que trae sus lotes y, en las
 * salidas, propone el que vence primero entre los que tienen existencia en la bodega) y leer un código de barras.
 */
export function usarRenglones(
  renglones: Ref<EdicionDeRenglon[]>,
  catalogo: CatalogoDeRenglones,
  contexto: ContextoDeRenglones,
) {
  const { proponerLote, reproponerLotes } = usarLotePropuesto(renglones, catalogo, contexto);

  async function alElegirArticulo(renglon: EdicionDeRenglon): Promise<void> {
    renglon.loteId = null;
    renglon.unidadId = null;
    await catalogo.cargarDetalle(renglon.articuloId);
    await proponerLote(renglon);
  }

  const leerCodigo = usarLecturaDeCodigo(renglones, catalogo, alElegirArticulo);

  return {
    agregar: () => renglones.value.push(renglonNuevo()),
    quitar: (indice: number) => renglones.value.splice(indice, 1),
    alElegirArticulo,
    reproponerLotes,
    leerCodigo,
  };
}
