import { computed, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiAccesosABodegas as api } from '../../servicios/accesos-a-bodegas.api';
import {
  alternarBodega,
  marcarTodas,
  nombreDeUsuario,
  opcionesDeUsuarios,
  porNombre,
  resumenDeCambios,
} from './edicion-de-accesos';
import { usarDatosDeAccesos } from './usar-datos-de-accesos';

/** La ventana de accesos: elegir un usuario, marcar sus bodegas y guardar el conjunto final. */
export function usarAccesosABodegas() {
  const datos = usarDatosDeAccesos();
  const { abierta, bodegas, seleccion } = datos;
  const { usuario, resumen, esPropio, opciones, ordenadas } = derivados(datos);
  const guardado = usarGuardado(datos, { usuario, resumen, esPropio });

  return {
    ...datos,
    enviando: guardado.enviando,
    usuario,
    esPropio,
    resumen,
    opciones,
    bodegas: ordenadas,
    cerrar: () => (abierta.value = false),
    ...accionesDeSeleccion(seleccion, bodegas),
    guardar: guardado.guardar,
  };
}

/** Quien se da acceso a sí mismo lo confirma antes de guardar. */
function confirmarAsignacionPropia(avisos: ReturnType<typeof usarAvisos>, resumen: string | null): Promise<boolean> {
  return avisos.confirmar({
    titulo: 'Cambiar sus propios accesos',
    mensaje: `Está cambiando sus propios accesos. ${resumen ?? ''} Todo queda registrado en la auditoría. ¿Continuar?`,
    textoConfirmar: 'Guardar',
  });
}

/** Marcar una bodega o todas. */
function accionesDeSeleccion(seleccion: Ref<string[]>, bodegas: Ref<{ id: string }[]>) {
  return {
    alternar: (id: string) => (seleccion.value = alternarBodega(seleccion.value, id)),
    marcar: (marcar: boolean) =>
      (seleccion.value = marcarTodas(
        seleccion.value,
        bodegas.value.map((l) => l.id),
        marcar,
      )),
  };
}

/** Lo que se calcula a partir de lo traído: usuario elegido, resumen de cambios y opciones. */
function derivados(datos: ReturnType<typeof usarDatosDeAccesos>) {
  const propioId = usarSesion().usuario?.id ?? null;
  const { usuarios, bodegas, usuarioId, original, seleccion } = datos;
  return {
    usuario: computed(() => usuarios.value.find((u) => u.usuarioId === usuarioId.value) ?? null),
    resumen: computed(() => resumenDeCambios(original.value, seleccion.value)),
    esPropio: computed(() => !!usuarioId.value && usuarioId.value === propioId),
    opciones: computed(() => opcionesDeUsuarios(usuarios.value, propioId)),
    ordenadas: computed(() => porNombre(bodegas.value)),
  };
}

type Derivados = Pick<ReturnType<typeof derivados>, 'usuario' | 'resumen' | 'esPropio'>;

/** Guarda el conjunto final; quien se asigna a sí mismo lo confirma primero. */
function usarGuardado(datos: ReturnType<typeof usarDatosDeAccesos>, { usuario, resumen, esPropio }: Derivados) {
  const avisos = usarAvisos();
  const { enviando, enviar } = usarFormulario();

  async function guardar(): Promise<void> {
    const id = datos.usuarioId.value;
    if (!id) return;
    if (esPropio.value && !(await confirmarAsignacionPropia(avisos, resumen.value))) return;
    if (!(await enviar(() => api.reemplazarDeUsuario(id, datos.seleccion.value)))) return;
    avisos.exito(`Accesos de ${usuario.value ? nombreDeUsuario(usuario.value) : 'el usuario'} guardados.`);
    datos.abierta.value = false;
  }

  return { enviando, guardar };
}
