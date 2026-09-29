<script setup lang="ts">
import { computed } from 'vue';
import { LockKeyhole, LockKeyholeOpen } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearFechaHora } from '@/modulos/core/utilidades/formato';
import type { CargaInicial } from '../servicios/datos-de-empresa.api';

const props = defineProps<{
  carga: CargaInicial | null;
  errores: Record<string, string>;
  enviando: boolean;
  /** Hay fecha guardada y sin cambios pendientes en el campo. */
  puedeCerrar: boolean;
}>();
const emit = defineEmits<{ cerrar: []; reabrir: [] }>();
const fechaDeInicio = defineModel<string>('fechaDeInicio', { required: true });

const cerrada = computed(() => props.carga?.cerrada ?? false);
const detalleDelCierre = computed(() => {
  const { cerradaEn, cerradaPor } = props.carga ?? {};
  return cerradaEn ? `Cerrada el ${formatearFechaHora(cerradaEn)}${cerradaPor ? ` por ${cerradaPor}` : ''}.` : '';
});
</script>

<template>
  <fieldset class="space-y-3">
    <legend class="mb-2 flex items-center gap-2 text-sm font-semibold text-tierra-800 dark:text-tierra-100">
      Fecha de inicio y carga inicial
      <InsigniaBase v-if="carga" :tono="cerrada ? 'campo' : 'trigo'">{{
        cerrada ? 'Cerrada' : 'Abierta'
      }}</InsigniaBase>
    </legend>
    <CampoTexto
      v-model="fechaDeInicio"
      etiqueta="Fecha de inicio"
      tipo="date"
      :solo-lectura="cerrada"
      :error="errores.fechaDeInicio"
      :ayuda="
        cerrada
          ? `Fija desde el ${formatearFecha(carga?.fechaDeInicio)}. ${detalleDelCierre}`
          : 'Desde qué día lleva la empresa su contabilidad en Arrancar. Se puede corregir mientras la carga inicial esté abierta.'
      "
    />
    <div class="flex flex-wrap gap-2">
      <BotonBase
        v-if="!cerrada"
        v-permiso="'empresas.carga-inicial.cerrar'"
        variante="secundario"
        pequeno
        :icono="LockKeyhole"
        :deshabilitado="!puedeCerrar"
        :cargando="enviando"
        @click="emit('cerrar')"
      >
        Cerrar carga inicial
      </BotonBase>
      <BotonBase
        v-else
        v-permiso="'empresas.carga-inicial.reabrir'"
        variante="secundario"
        pequeno
        :icono="LockKeyholeOpen"
        @click="emit('reabrir')"
      >
        Reabrir carga inicial
      </BotonBase>
    </div>
    <p v-if="!cerrada && !puedeCerrar" class="text-xs text-tierra-500">
      Para cerrar la carga inicial, guarde primero la fecha de inicio.
    </p>
  </fieldset>
</template>
