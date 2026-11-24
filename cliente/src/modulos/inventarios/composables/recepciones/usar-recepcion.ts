import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { Documento } from '../../servicios/documentos.api';
import { apiRecepciones, type LineaPorRecibir } from '../../servicios/recepciones.api';
import { fechaDeHoy } from '../compartido/fechas';
import { usarAvisoDeReferencias } from '../compartido/referencias-que-faltan';
import { usarCatalogoDeRenglones } from '../documentos/usar-catalogo-de-renglones';
import { usarBodegasDeDocumento } from '../documentos/usar-referencias-de-documento';
import {
  datosDeRecepcion,
  dividirRenglon,
  erroresDeRecepcion,
  recepcionNueva,
  resumenDeRecepcion,
  type EdicionDeRecepcion,
} from './edicion-de-recepcion';

const cerrada = (): EdicionDeRecepcion => ({ ...recepcionNueva([], ''), abierta: false });

/** Revisa, confirma con el resumen, envía y avisa lo que el servidor recomienda (por ejemplo, fechas lejanas). */
function usarGuardadoDeRecepcion(edicion: Ref<EdicionDeRecepcion>, bodegas: Ref<OpcionDeRegistro[]>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  async function guardar(alTerminar: () => Promise<void>): Promise<void> {
    errores.value = erroresDeRecepcion(edicion.value);
    if (Object.keys(errores.value).length) return avisos.error('Revise los campos marcados: falta información.');
    const bodega = bodegas.value.find((opcion) => opcion.valor === edicion.value.bodegaId)?.texto ?? '';
    const mensaje = resumenDeRecepcion(edicion.value, bodega);
    if (!(await avisos.confirmar({ titulo: 'Recibir mercadería', mensaje, textoConfirmar: 'Recibir' }))) return;
    let recibidos: Documento[] = [];
    const datos = datosDeRecepcion(edicion.value);
    if (!(await enviar(async () => (recibidos = (await apiRecepciones.recibir(datos)).documentos)))) return;
    avisos.exito(
      recibidos.length === 1 ? `Recepción n.º ${recibidos[0]!.numero} registrada.` : 'Recepciones registradas.',
    );
    recibidos.flatMap((documento) => documento.avisos).forEach((aviso) => avisos.info(aviso));
    edicion.value.abierta = false;
    await alTerminar();
  }

  return { enviando, errores, guardar };
}

/** Con una sola bodega para elegir, la ventana ya la trae elegida. */
function bodegaUnicaDe(opciones: OpcionDeRegistro[]): string | null {
  const activas = opciones.filter((opcion) => opcion.valor !== null);
  return activas.length === 1 ? activas[0]!.valor : null;
}

/** La ventana «Recibir»: un renglón por línea elegida, con el artículo sugerido y todo el pendiente. */
export function usarRecepcion(alTerminar: () => Promise<void>) {
  const edicion = ref<EdicionDeRecepcion>(cerrada());
  const catalogo = usarCatalogoDeRenglones();
  const opcionesDeBodegas = usarBodegasDeDocumento(() => undefined);
  const { enviando, errores, guardar } = usarGuardadoDeRecepcion(edicion, opcionesDeBodegas);

  function abrir(lineas: LineaPorRecibir[]): void {
    errores.value = {};
    edicion.value = recepcionNueva(lineas, fechaDeHoy());
    edicion.value.bodegaId = bodegaUnicaDe(opcionesDeBodegas.value);
    edicion.value.renglones.forEach((renglon) => void catalogo.cargarDetalle(renglon.articuloId));
  }

  return {
    edicion,
    catalogo,
    avisoDeReferencias: usarAvisoDeReferencias(),
    opcionesDeBodegas,
    enviando,
    errores,
    abrir,
    guardar: () => guardar(alTerminar),
    dividir: (indice: number) => (edicion.value.renglones = dividirRenglon(edicion.value.renglones, indice)),
    quitar: (indice: number) => edicion.value.renglones.splice(indice, 1),
    alElegirArticulo: (articuloId: string | null) => catalogo.cargarDetalle(articuloId),
  };
}
