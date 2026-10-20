<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { MAXIMO_DEL_MOTIVO, proximoFolio } from '../../composables/libro/datos-de-emisiones';
import { VENTANA_DE_EMISION as textos } from '../../textos-del-libro';

/** Confirma gastar folios: dice desde cuál empieza y, si el período ya se emitió, pide el motivo. */
defineProps<{
  abierta: boolean;
  periodo: string;
  ultimoFolio: number;
  pideMotivo: boolean;
  enviando: boolean;
  errores: Record<string, string>;
}>();
const motivo = defineModel<string>('motivo', { required: true });
defineEmits<{ emitir: []; cerrar: [] }>();
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="textos.titulo" @cerrar="$emit('cerrar')">
    <form id="emitir-libro" class="flex flex-col gap-4" @submit.prevent="$emit('emitir')">
      <p class="text-sm">
        Se emitirá el libro de <strong>{{ periodo }}</strong> en PDF con número de folio en cada hoja.
      </p>
      <dl class="grid grid-cols-2 gap-3 rounded-xl bg-tierra-50 p-3 text-sm dark:bg-tierra-800">
        <div>
          <dt class="text-tierra-500">Último folio usado</dt>
          <dd class="text-lg font-semibold tabular-nums">{{ ultimoFolio }}</dd>
        </div>
        <div>
          <dt class="text-tierra-500">Empezará en el folio</dt>
          <dd class="text-lg font-semibold tabular-nums">{{ proximoFolio(ultimoFolio) }}</dd>
        </div>
      </dl>
      <p
        class="flex gap-2 rounded-xl bg-trigo-50 p-3 text-sm text-trigo-900 dark:bg-trigo-900/30 dark:text-trigo-100"
        role="note"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Esto gasta folios de las hojas habilitadas por la SAT y no se puede deshacer. Si solo quiere revisar, use «Ver
          borrador».
        </span>
      </p>
      <CampoTexto
        v-if="pideMotivo"
        v-model="motivo"
        :etiqueta="textos.motivo"
        :ayuda="textos.motivoAyuda"
        :error="errores.motivo"
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        multilinea
        requerido
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" :deshabilitado="enviando" @click="$emit('cerrar')">
        {{ textos.cancelar }}
      </BotonBase>
      <BotonBase tipo="submit" form="emitir-libro" :cargando="enviando">{{ textos.confirmar }}</BotonBase>
    </template>
  </VentanaModal>
</template>
