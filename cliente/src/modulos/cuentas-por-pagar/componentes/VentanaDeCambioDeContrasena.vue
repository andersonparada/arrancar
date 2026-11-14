<script setup lang="ts">
import { computed } from 'vue';
import { Info } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { MAXIMO_DE_OBSERVACIONES } from '../composables/contrasenas/edicion-de-contrasena';
import {
  AVISO_DE_REIMPRESION,
  cambiaLaFechaDePago,
  type EdicionDeCambioDeContrasena,
} from '../composables/contrasenas/ficha-de-contrasena';
import type { FichaDeContrasena } from '../servicios/tipos-de-contrasenas';
import { MAXIMO_DEL_MOTIVO } from '../textos';

/** Cambiar la fecha prometida de pago (con motivo, porque el proveedor tiene un papel con la fecha anterior) y las observaciones. */
const props = defineProps<{ ficha: FichaDeContrasena; errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeCambioDeContrasena>({ required: true });
const pideMotivo = computed(() => cambiaLaFechaDePago(edicion.value, props.ficha));
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Cambiar fecha de pago" @cerrar="emit('cerrar')">
    <form id="form-cambio-de-contrasena" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p
        v-if="ficha.impresa"
        class="flex gap-2 rounded-lg bg-trigo-300/40 p-3 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
        role="note"
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ AVISO_DE_REIMPRESION }}</span>
      </p>
      <CampoTexto
        v-model="edicion.fechaDePago"
        etiqueta="Fecha prometida de pago"
        tipo="date"
        requerido
        ayuda="No puede ser anterior a la fecha de la contraseña."
        :error="errores.fechaDePago"
      />
      <CampoTexto
        v-if="pideMotivo"
        v-model="edicion.motivo"
        etiqueta="Motivo del cambio"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="El proveedor tiene un papel con la fecha anterior; el motivo queda en la auditoría."
        :error="errores.motivo"
      />
      <CampoTexto
        v-model="edicion.observaciones"
        etiqueta="Observaciones"
        multilinea
        contar
        :longitud-maxima="MAXIMO_DE_OBSERVACIONES"
        :error="errores.observaciones"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-cambio-de-contrasena" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
