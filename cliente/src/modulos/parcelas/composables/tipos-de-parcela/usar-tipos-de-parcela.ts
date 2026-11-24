import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiTiposDeParcela, type TipoDeParcela } from '../../servicios/tipos-de-parcela.api';
import { datosDeTipoDeParcela, edicionDe, type EdicionDeTipoDeParcela } from './edicion-de-tipo-de-parcela';

const SIN_REGISTROS: TipoDeParcela[] = [];

const guardarTipoDeParcela = (edicion: EdicionDeTipoDeParcela) =>
  edicion.id
    ? apiTiposDeParcela.actualizar(edicion.id, datosDeTipoDeParcela(edicion))
    : apiTiposDeParcela.crear(datosDeTipoDeParcela(edicion));

/** La ventana de los tipos de parcela: abrirla y guardar lo escrito, avisando y recargando la lista. */
function usarVentanaDeTiposDeParcela(cargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeTipoDeParcela>({ ...edicionDe(), abierta: false });

  function abrir(tipoDeParcela?: TipoDeParcela): void {
    edicion.value = edicionDe(tipoDeParcela);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarTipoDeParcela(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Tipo de parcela registrado.' : 'Tipo de parcela actualizado.');
    edicion.value.abierta = false;
    await cargar();
  }

  return { edicion, enviando, errores, abrir, guardar };
}

/** Los tipos de parcela de la empresa: listarlos, registrarlos y editarlos en una ventana. */
export function usarTiposDeParcela() {
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(() => apiTiposDeParcela.listar(), SIN_REGISTROS, 'No se pudieron cargar los tipos de parcela.');
  const ventana = usarVentanaDeTiposDeParcela(cargar);

  const intercambio = usarIntercambio(apiTiposDeParcela.intercambio, cargar);

  return { registros, cargando, cargar, intercambio, ...ventana };
}
