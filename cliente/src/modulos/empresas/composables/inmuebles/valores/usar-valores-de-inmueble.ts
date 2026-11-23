import { computed, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import {
  apiValoresDeInmueble,
  type FuenteDeValor,
  type ValorDeInmueble,
} from '../../../servicios/valores-de-inmueble.api';
import {
  datosDeValor,
  edicionDeValor,
  hoyEnIso,
  mensajeDeEliminacionDeValor,
  valorVigente,
  valoresDeLaFuente,
  type EdicionDeValor,
} from './edicion-de-valor';

const SIN_VALORES: ValorDeInmueble[] = [];

/** La ventana para registrar un valor: abrirla y guardar lo escrito, avisando y recargando las listas. */
function usarVentanaDeValor(inmuebleId: string, cargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeValor>({ ...edicionDeValor('matricula_fiscal'), abierta: false });

  function abrir(fuente: FuenteDeValor): void {
    edicion.value = edicionDeValor(fuente);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    if (!(await enviar(() => apiValoresDeInmueble.registrar(inmuebleId, datosDeValor(edicion.value))))) return;
    avisos.exito('Valor registrado.');
    edicion.value.abierta = false;
    await cargar();
  }

  return { edicion, enviando, errores, abrir, guardar };
}

/** Eliminar un valor con confirmación; si Activos fijos ya lo usó en un mes cerrado, el aviso del servidor lo explica. */
function usarEliminacionDeValor(inmuebleId: string, cargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  async function eliminar(valor: ValorDeInmueble): Promise<void> {
    const mensaje = mensajeDeEliminacionDeValor(valor.fuente, formatearFecha(valor.vigenteDesde));
    if (!(await avisos.confirmar({ mensaje, textoConfirmar: 'Eliminar', peligroso: true }))) return;
    if (!(await enviar(() => apiValoresDeInmueble.eliminar(inmuebleId, valor.id)))) return;
    avisos.exito('Valor eliminado.');
    await cargar();
  }

  return { eliminar };
}

/** Los valores del inmueble en sus dos series (matrícula fiscal y catastro): verlos, registrar uno y eliminarlo. */
export function usarValoresDeInmueble(inmuebleId: string) {
  const {
    datos: valores,
    cargando,
    cargar,
  } = usarCarga(
    () => apiValoresDeInmueble.listar(inmuebleId),
    SIN_VALORES,
    'No se pudieron cargar los valores del inmueble.',
  );
  const series = computed(() =>
    (['matricula_fiscal', 'catastro_municipal'] as const).map((fuente) => {
      const lista = valoresDeLaFuente(valores.value, fuente);
      return { fuente, valores: lista, vigente: valorVigente(lista, hoyEnIso()) };
    }),
  );

  return {
    series,
    cargando,
    ...usarVentanaDeValor(inmuebleId, cargar),
    ...usarEliminacionDeValor(inmuebleId, cargar),
  };
}
