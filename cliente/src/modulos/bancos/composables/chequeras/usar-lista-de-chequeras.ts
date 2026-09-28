import { ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { apiChequeras, type Chequera } from '../../servicios/chequeras.api';
import { usarReferenciasDeCuenta } from '../cuentas-bancarias/referencias-de-cuenta';
import { rangoDeChequera } from './detalles-de-chequera';
import { usarFormularioDeChequeraDeLaEmpresa } from './usar-formulario-de-chequera-de-la-empresa';

/** Pide confirmación antes de inactivar o reactivar una chequera. */
function confirmarCambioDeEstado(avisos: ReturnType<typeof usarAvisos>, chequera: Chequera) {
  const activar = !chequera.activa;
  const mensaje = activar
    ? `¿Reactivar la chequera ${rangoDeChequera(chequera)}?`
    : `¿Inactivar la chequera ${rangoDeChequera(chequera)}? No se le podrán emitir más cheques.`;
  return avisos.confirmar({ mensaje, textoConfirmar: activar ? 'Reactivar' : 'Inactivar' });
}

/** Inactivar o reactivar una chequera, con su confirmación y aviso. */
function usarCambioDeEstadoDeChequera(alCambiar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  async function cambiarEstado(chequera: Chequera): Promise<void> {
    if (!(await confirmarCambioDeEstado(avisos, chequera))) return;
    const activar = !chequera.activa;
    const llamar = () => (activar ? apiChequeras.reactivar(chequera.id) : apiChequeras.inactivar(chequera.id));
    if (!(await enviar(llamar))) return;
    avisos.exito(activar ? 'Chequera reactivada.' : 'Chequera inactivada.');
    await alCambiar();
  }

  return cambiarEstado;
}

/** Las chequeras de la empresa, opcionalmente filtradas por cuenta; recarga sola al cambiar el filtro. */
function usarCargaDeChequeras() {
  const cuentaBancariaId = ref<string | null>(null);
  const {
    datos: chequeras,
    cargando,
    cargar,
  } = usarCarga(
    () => apiChequeras.listar(cuentaBancariaId.value),
    [] as Chequera[],
    'No se pudieron cargar las chequeras.',
  );
  watch(cuentaBancariaId, cargar);
  return { chequeras, cargando, cargar, cuentaBancariaId };
}

/**
 * Las chequeras de la empresa: filtrarlas por cuenta, crear una nueva
 * (eligiendo su cuenta), inactivarla o reactivarla, e importar/exportar Excel.
 */
export function usarListaDeChequeras() {
  const { chequeras, cargando, cargar, cuentaBancariaId } = usarCargaDeChequeras();
  const { campos: referencias, filtroDeCuenta } = usarReferenciasDeCuenta();
  const formulario = usarFormularioDeChequeraDeLaEmpresa(cargar);
  const intercambio = usarIntercambio(apiChequeras.intercambio, cargar);
  const cambiarEstado = usarCambioDeEstadoDeChequera(cargar);

  return {
    chequeras,
    cargando,
    cargar,
    cuentaBancariaId,
    opcionesDelFiltro: filtroDeCuenta,
    opcionesDeCuenta: referencias,
    cambiarEstado,
    intercambio,
    ...formulario,
  };
}
