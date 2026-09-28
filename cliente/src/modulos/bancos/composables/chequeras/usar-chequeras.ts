import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiChequeras, type Chequera } from '../../servicios/chequeras.api';
import { rangoDeChequera } from './detalles-de-chequera';
import { usarFormularioDeChequera } from './usar-formulario-de-chequera';

/** Pide confirmación antes de inactivar o reactivar una chequera. */
function confirmarCambioDeEstado(avisos: ReturnType<typeof usarAvisos>, chequera: Chequera) {
  const activar = !chequera.activa;
  const mensaje = activar
    ? `¿Reactivar la chequera ${rangoDeChequera(chequera)}?`
    : `¿Inactivar la chequera ${rangoDeChequera(chequera)}? No se le podrán emitir más cheques.`;
  return avisos.confirmar({ mensaje, textoConfirmar: activar ? 'Reactivar' : 'Inactivar' });
}

/** Las chequeras de una cuenta bancaria: verlas, crear una nueva e inactivarla o reactivarla. */
export function usarChequeras(cuentaBancariaId: string) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();
  const {
    datos: chequeras,
    cargando,
    cargar,
  } = usarCarga(
    () => apiChequeras.listarDeLaCuenta(cuentaBancariaId),
    [] as Chequera[],
    'No se pudieron cargar las chequeras.',
  );
  const formulario = usarFormularioDeChequera(cuentaBancariaId, cargar);

  async function cambiarEstado(chequera: Chequera): Promise<void> {
    if (!(await confirmarCambioDeEstado(avisos, chequera))) return;
    const activar = !chequera.activa;
    const llamar = () => (activar ? apiChequeras.reactivar(chequera.id) : apiChequeras.inactivar(chequera.id));
    if (!(await enviar(llamar))) return;
    avisos.exito(activar ? 'Chequera reactivada.' : 'Chequera inactivada.');
    await cargar();
  }

  return { chequeras, cargando, cargar, cambiarEstado, ...formulario };
}
