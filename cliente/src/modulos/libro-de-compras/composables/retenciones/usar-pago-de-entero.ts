import { computed, reactive, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiRetenciones, type GrupoDelMes, type PagoDeEntero } from '../../servicios/retenciones.api';
import {
  cuerpoDelPago,
  faltanteTrasElPago,
  pagoNuevo,
  pagoParaCorregir,
  revisarPago,
  type PagoEnEdicion,
} from './datos-de-pagos';

/** Manda el pago nuevo o la corrección y avisa; devuelve nada si no hay grupo. */
async function enviarPago(grupo: GrupoDelMes, corrigiendo: PagoDeEntero | null, pago: PagoEnEdicion) {
  const avisos = usarAvisos();
  const datos = cuerpoDelPago(pago);
  const resultado = corrigiendo
    ? await apiRetenciones.corregirPago(corrigiendo.id, datos)
    : await apiRetenciones.registrarPago(grupo.mes, grupo.grupo, datos);
  avisos.exito(corrigiendo ? 'Pago corregido.' : 'Pago registrado.');
  resultado.avisos.forEach((aviso) => avisos.info(aviso));
}

/** Lo que se escribe, el grupo y el pago que se corrige (si es el caso). */
function usarEdicionDelPago(errores: { value: Record<string, string> }) {
  const abierta = ref(false);
  const grupo = ref<GrupoDelMes | null>(null);
  const corrigiendo = ref<PagoDeEntero | null>(null);
  const pago = reactive<PagoEnEdicion>({ fechaDePago: '', documentoDePago: '', monto: '', observaciones: '' });

  function abrir(delGrupo: GrupoDelMes, edicion: PagoEnEdicion, corregido: PagoDeEntero | null): void {
    Object.assign(pago, edicion);
    errores.value = {};
    grupo.value = delGrupo;
    corrigiendo.value = corregido;
    abierta.value = true;
  }

  return {
    abierta,
    grupo,
    corrigiendo,
    pago,
    faltante: computed(() => (grupo.value ? faltanteTrasElPago(grupo.value, pago.monto, corrigiendo.value) : null)),
    registrar: (delGrupo: GrupoDelMes) => abrir(delGrupo, pagoNuevo(delGrupo, new Date()), null),
    corregir: (delGrupo: GrupoDelMes, existente: PagoDeEntero) =>
      abrir(delGrupo, pagoParaCorregir(existente), existente),
  };
}

/** La ventana para registrar un pago de un mes y grupo, o corregir uno ya registrado. */
export function usarPagoDeEntero(alTerminar: () => Promise<void>) {
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = usarEdicionDelPago(errores);

  async function guardar(): Promise<void> {
    const delGrupo = edicion.grupo.value;
    errores.value = revisarPago(edicion.pago);
    if (!delGrupo || Object.keys(errores.value).length > 0) return;
    const bien = await enviar(() => enviarPago(delGrupo, edicion.corrigiendo.value, edicion.pago));
    if (!bien) return;
    edicion.abierta.value = false;
    await alTerminar();
  }

  return { ...edicion, enviando, errores, guardar };
}
