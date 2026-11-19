import { onMounted, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';
import { departamentoValido } from '../activos/edicion-de-activo';
import { usarReferenciasDeActivo } from '../activos/usar-referencias-de-activo';
import {
  datosDeSaldo,
  edicionDeSaldo,
  edicionDeSaldoNueva,
  erroresDeSaldo,
  type EdicionDeSaldoInicial,
} from './edicion-de-saldo-inicial';

type Departamentos = Parameters<typeof departamentoValido>[0];

/**
 * Al cambiar la localidad se deja el departamento solo si sigue siendo válido. Mientras las ubicaciones no han
 * llegado (lista vacía) no actúa: no puede saber si es válido y borraría el de un saldo que se está corrigiendo.
 */
export function usarDepartamentoCoherente(
  edicion: Ref<EdicionDeSaldoInicial>,
  departamentos: Ref<Departamentos>,
): void {
  watch(
    () => edicion.value.localidadId,
    () => {
      if (departamentos.value.length === 0) return;
      const { localidadId, departamentoId } = edicion.value;
      edicion.value.departamentoId = departamentoValido(departamentos.value, { localidadId, departamentoId });
    },
  );
}

/** Al abrir una corrección, trae lo cargado y lo pone en el formulario; devuelve si todavía está cargando. */
function usarSaldoACorregir(activoId: string | undefined, edicion: Ref<EdicionDeSaldoInicial>) {
  const avisos = usarAvisos();
  const cargando = ref(activoId !== undefined);

  onMounted(async () => {
    if (activoId === undefined) return;
    try {
      edicion.value = edicionDeSaldo(await apiSaldosIniciales.obtener(activoId));
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar el saldo inicial.');
    } finally {
      cargando.value = false;
    }
  });

  return cargando;
}

/**
 * El formulario del saldo inicial: alta, o corrección si llega `activoId` (se trae lo cargado). Revisa lo escrito
 * antes de enviar y reparte los errores del servidor por campo.
 */
export function usarFormularioDeSaldo(activoId: string | undefined) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref(edicionDeSaldoNueva());
  const referencias = usarReferenciasDeActivo(edicion);
  usarDepartamentoCoherente(edicion, referencias.departamentos);
  const cargando = usarSaldoACorregir(activoId, edicion);

  /** @returns `true` si el servidor lo aceptó. */
  async function guardar(): Promise<boolean> {
    errores.value = erroresDeSaldo(edicion.value, referencias.inciso.value);
    if (Object.keys(errores.value).length > 0) return false;
    const datos = datosDeSaldo(edicion.value, referencias.inciso.value);
    const aceptado = await enviar(() =>
      activoId ? apiSaldosIniciales.corregir(activoId, datos) : apiSaldosIniciales.guardar(datos),
    );
    if (aceptado) avisos.exito(activoId ? 'Saldo inicial corregido.' : 'Saldo inicial cargado.');
    return aceptado;
  }

  return { edicion, enviando, errores, cargando, referencias, guardar };
}
