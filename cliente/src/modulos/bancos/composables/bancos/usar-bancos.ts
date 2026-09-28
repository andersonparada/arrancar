import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiBancos, type Banco } from '../../servicios/bancos.api';
import { datosDeBanco, edicionDe, type EdicionDeBanco } from './edicion-de-banco';

const guardarBanco = (edicion: EdicionDeBanco) =>
  edicion.id ? apiBancos.actualizar(edicion.id, datosDeBanco(edicion)) : apiBancos.crear(datosDeBanco(edicion));

/** Los bancos de la empresa: listarlos, registrarlos y editarlos en una ventana. */
export function usarBancos() {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(() => apiBancos.listar(), [] as Banco[], 'No se pudieron cargar los bancos.');
  const edicion = ref<EdicionDeBanco>({ ...edicionDe(), abierta: false });

  function abrir(banco?: Banco): void {
    edicion.value = edicionDe(banco);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarBanco(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Banco registrado.' : 'Banco actualizado.');
    edicion.value.abierta = false;
    await cargar();
  }

  const intercambio = usarIntercambio(apiBancos.intercambio, cargar);

  return { registros, cargando, cargar, intercambio, edicion, enviando, errores, abrir, guardar };
}
