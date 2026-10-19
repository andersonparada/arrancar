<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeDocumento } from '../../composables/documentos/edicion-de-documento';

/** Datos que casi nunca hacen falta: el IVA que dice la FEL, si no se vincula a ventas gravadas y las observaciones. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeDocumento>({ required: true });
</script>

<template>
  <details
    class="group rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 sm:p-5 dark:bg-tierra-800/60 dark:ring-tierra-700"
  >
    <summary class="cursor-pointer font-semibold marker:text-tierra-400">Más datos (opcionales)</summary>
    <div class="mt-4 space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.ivaDeLaFel"
          tipo="number"
          paso="any"
          etiqueta="IVA que dice la FEL (Q)"
          ayuda="Si lo escribe, el cálculo se ajusta a ese IVA (hasta unos pocos centavos de diferencia)."
          :error="errores.ivaDeLaFel"
        />
        <CampoTexto
          v-model="edicion.observaciones"
          etiqueta="Observaciones"
          :longitud-maxima="500"
          :error="errores.observaciones"
        />
      </div>
      <CampoInterruptor
        v-model="edicion.noVinculado"
        etiqueta="Esta compra no se usa en ventas gravadas con IVA"
        descripcion="Si la compra no está vinculada a ventas gravadas (Ley del IVA, art. 16), su IVA no es crédito fiscal."
      />
    </div>
  </details>
</template>
