<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import type { FilaDeEnlace } from '../composables/edicion-de-enlaces';
import type { Cuenta } from '../servicios/cuentas.api';

/** Un rol (o un registro de otro módulo) con su cuenta: se elige con un clic y se guarda al instante. */
const props = defineProps<{
  fila: FilaDeEnlace;
  cuentas: Cuenta[];
  puedeEditar: boolean;
  ocupada: boolean;
}>();
const emit = defineEmits<{ elegir: [cuentaId: string]; quitar: [] }>();

const opciones = computed(() => {
  const propias = props.cuentas.map((cuenta) => ({ valor: cuenta.id, texto: `${cuenta.codigo} · ${cuenta.nombre}` }));
  const enlazada = props.fila.enlace;
  const falta = enlazada && !propias.some((o) => o.valor === enlazada.cuentaId);
  // La cuenta ya enlazada puede haberse inactivado o no verse (sin permiso): se muestra para no dejar el selector vacío.
  return falta
    ? [{ valor: enlazada.cuentaId, texto: `${enlazada.cuentaCodigo} · ${enlazada.cuentaNombre}` }, ...propias]
    : propias;
});
</script>

<template>
  <li
    class="grid gap-2 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] sm:items-end sm:gap-4"
    :class="fila.falta ? 'border-l-4 border-trigo-500 bg-trigo-300/10 pl-3' : ''"
  >
    <div class="min-w-0">
      <p class="break-words text-sm font-medium">{{ fila.nombre }}</p>
      <InsigniaBase v-if="fila.falta" tono="trigo">Falta elegir la cuenta</InsigniaBase>
      <InsigniaBase v-else-if="fila.huerfana" tono="rojo">Ya no existe en su módulo</InsigniaBase>
    </div>
    <CampoSelector
      :model-value="fila.enlace?.cuentaId ?? null"
      :etiqueta="`Cuenta para ${fila.nombre}`"
      ocultar-etiqueta
      :opciones="opciones"
      :deshabilitado="!puedeEditar || ocupada || cuentas.length === 0"
      texto-vacio="Elija una cuenta"
      @update:model-value="(cuentaId) => cuentaId && emit('elegir', cuentaId)"
    />
    <BotonBase
      v-if="puedeEditar && fila.enlace"
      variante="fantasma"
      pequeno
      :icono="X"
      :deshabilitado="ocupada"
      :aria-label="`Quitar el enlace de ${fila.nombre}`"
      @click="emit('quitar')"
    />
    <span v-else class="hidden sm:block sm:w-8" aria-hidden="true" />
  </li>
</template>
