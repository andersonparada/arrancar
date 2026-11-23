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

/**
 * Las acciones sobre los renglones de un documento: agregar, quitar, elegir artículo (que trae sus lotes y propone el
 * que vence primero en las salidas) y leer un código de barras.
 */
export function usarRenglones(renglones: Ref<EdicionDeRenglon[]>, catalogo: CatalogoDeRenglones, esSalida: boolean) {
  const avisos = usarAvisos();

  async function alElegirArticulo(renglon: EdicionDeRenglon): Promise<void> {
    renglon.loteId = null;
    renglon.unidadId = null;
    await catalogo.cargarDetalle(renglon.articuloId);
    if (esSalida) renglon.loteId = lotePropuesto(catalogo.lotesDe(renglon.articuloId), fechaDeHoy());
  }

  /** Un código leído (o escrito) agrega su artículo; si no existe, dice cómo seguir. */
  async function leerCodigo(texto: string): Promise<void> {
    const articulo = articuloDeCodigo(catalogo.articulos.value, texto);
    if (!articulo) return avisos.error(sinArticuloConCodigo(texto));
    renglones.value = agregarLeido(sinRenglonesVacios(renglones.value), articulo.id);
    const agregado = renglones.value.find((renglon) => renglon.articuloId === articulo.id);
    if (agregado && !agregado.loteId) await alElegirArticulo(agregado);
  }

  return {
    agregar: () => renglones.value.push(renglonNuevo()),
    quitar: (indice: number) => renglones.value.splice(indice, 1),
    alElegirArticulo,
    leerCodigo,
  };
}
