import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiConceptos, type Concepto } from '../../servicios/conceptos.api';
import { usarBajaDeRegistro } from '../comunes/usar-baja-de-registro';
import { datosParaCambiarEstado, mensajeDeCambioDeEstado } from './reglas-de-concepto';

/** Inactivar o reactivar (con confirmación) y eliminar (con motivo) un concepto del usuario. */
export function usarAccionesDeConcepto(alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();
  const eliminacion = usarBajaDeRegistro<Concepto>({
    ejecutar: (concepto, { motivo }) => apiConceptos.eliminar(concepto.id, motivo),
    aviso: 'Concepto eliminado.',
    alTerminar,
  });

  async function cambiarEstado(concepto: Concepto): Promise<void> {
    const reactivar = !concepto.activo;
    const mensaje = mensajeDeCambioDeEstado(concepto);
    if (!(await avisos.confirmar({ mensaje, textoConfirmar: reactivar ? 'Reactivar' : 'Inactivar' }))) return;
    const guardar = () => apiConceptos.actualizar(concepto.id, datosParaCambiarEstado(concepto));
    if (!(await enviar(guardar))) return;
    avisos.exito(reactivar ? 'Concepto reactivado.' : 'Concepto inactivado.');
    await alTerminar();
  }

  return { eliminacion, cambiarEstado };
}
