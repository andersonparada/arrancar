import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiDepartamentos, type Departamento } from '../../servicios/departamentos.api';
import { mensajeDeEliminacion } from './edicion-de-departamento';

/** Eliminar un departamento con confirmación; si está en uso, el aviso del servidor dice qué hacer. */
export function usarEliminacionDeDepartamento(alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  async function eliminar(departamento: Departamento): Promise<void> {
    const mensaje = mensajeDeEliminacion(departamento.nombre);
    if (!(await avisos.confirmar({ mensaje, textoConfirmar: 'Eliminar', peligroso: true }))) return;
    if (!(await enviar(() => apiDepartamentos.eliminar(departamento.id)))) return;
    avisos.exito('Departamento eliminado.');
    await alTerminar();
  }

  return { eliminar };
}
