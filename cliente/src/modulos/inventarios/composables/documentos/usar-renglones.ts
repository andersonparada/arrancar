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

/** Lo que los renglones necesitan saber del documento: si es salida (propone lote) y desde qué bodega sale. */
export interface ContextoDeRenglones {
  esSalida: boolean;
  bodegaId: () => string | null;
}

/** El lote que se propone en las salidas: el que vence primero y tiene existencia en la bodega; sin bodega o permiso, ninguno. */
function usarLotePropuesto(
  renglones: Ref<EdicionDeRenglon[]>,
  catalogo: CatalogoDeRenglones,
  contexto: ContextoDeRenglones,
) {
  async function proponerLote(renglon: EdicionDeRenglon): Promise<void> {
    if (!contexto.esSalida) return;
    const { articuloId } = renglon;
    const bodegaId = contexto.bodegaId();
    await catalogo.existenciasDeLotes.cargar(articuloId, bodegaId);
    if (renglon.articuloId !== articuloId || bodegaId !== contexto.bodegaId()) return;
    const conExistencia = catalogo.existenciasDeLotes.conExistencia(articuloId, bodegaId);
    renglon.loteId = lotePropuesto(catalogo.lotesDe(articuloId), fechaDeHoy(), conExistencia);
  }

  /** Al cambiar la bodega de la salida, el lote propuesto se vuelve a buscar entre los que hay en la nueva. */
  async function reproponerLotes(): Promise<void> {
    await Promise.all(renglones.value.filter((renglon) => renglon.articuloId).map(proponerLote));
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
