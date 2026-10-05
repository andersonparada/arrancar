import { reactive, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { seccionesParaEnviar } from '@/modulos/core/secciones/secciones-aportadas';
import { apiTerceros, type FichaTercero, type PapelTercero } from '../servicios/terceros.api';
import { papelesVacios, type PapelesDelFormulario } from './datos-de-tercero';

/** Los papeles que ya tiene, para editarlos; los que no tiene quedan con sus valores iniciales. */
function papelesDe(ficha: FichaTercero | null): PapelesDelFormulario {
  const papeles = papelesVacios();
  if (ficha?.cliente) papeles.cliente = { ...ficha.cliente };
  if (ficha?.proveedor) papeles.proveedor = { ...ficha.proveedor };
  return papeles;
}

function asignar(terceroId: string, papel: PapelTercero, { papeles, secciones }: Edicion) {
  return papel === 'cliente'
    ? apiTerceros.asignarCliente(terceroId, papeles.cliente)
    : apiTerceros.asignarProveedor(terceroId, papeles.proveedor, seccionesParaEnviar(secciones));
}

type Edicion = { papeles: PapelesDelFormulario; secciones: Record<string, unknown> };

/** El papel queda inactivo con su historial; no se borra. */
function quitar(terceroId: string, papel: PapelTercero) {
  return papel === 'cliente' ? apiTerceros.quitarCliente(terceroId) : apiTerceros.quitarProveedor(terceroId);
}

/** Asignar, cambiar o quitar el papel de cliente o de proveedor desde la ficha. */
export function usarPapelesDeLaFicha(ficha: Ref<FichaTercero | null>, alCambiar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = reactive({
    abierta: null as PapelTercero | null,
    papeles: papelesVacios(),
    secciones: {} as Record<string, unknown>,
  });

  const abrir = (papel: PapelTercero) =>
    Object.assign(edicion, { abierta: papel, papeles: papelesDe(ficha.value), secciones: {} });

  async function guardar(): Promise<void> {
    const { abierta } = edicion;
    if (!ficha.value || !abierta || !(await enviar(() => asignar(ficha.value!.id, abierta, edicion)))) return;
    edicion.abierta = null;
    await alCambiar();
  }

  async function quitarPapel(papel: PapelTercero): Promise<void> {
    const mensaje = `¿Quitar el papel de ${papel}? Su historial se conserva.`;
    if (!ficha.value || !(await avisos.confirmar({ mensaje, textoConfirmar: 'Quitar', peligroso: true }))) return;
    await quitar(ficha.value.id, papel).then(alCambiar, (error: Error) => avisos.error(error.message));
  }

  return { edicion, enviando, errores, abrir, guardar, quitar: quitarPapel };
}
