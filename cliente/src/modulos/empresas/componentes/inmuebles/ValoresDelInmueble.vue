<script setup lang="ts">
import type { EdicionDeValor } from '../../composables/inmuebles/valores/edicion-de-valor';
import type { FuenteDeValor, ValorDeInmueble } from '../../servicios/valores-de-inmueble.api';
import SerieDeValores from './SerieDeValores.vue';
import VentanaDeValor from './VentanaDeValor.vue';

/**
 * La sección «Valores» de la ficha del inmueble: una lista por fuente (matrícula fiscal y catastro municipal) y la
 * ventana para registrar uno. Un valor no se edita: se registra otro con otra fecha, o se elimina si nadie lo usó.
 */
defineProps<{
  series: { fuente: FuenteDeValor; valores: ValorDeInmueble[]; vigente: ValorDeInmueble | null }[];
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ registrar: [fuente: FuenteDeValor]; eliminar: [valor: ValorDeInmueble]; guardar: [] }>();
const edicion = defineModel<EdicionDeValor>({ required: true });
</script>

<template>
  <section class="space-y-4" aria-labelledby="valores-del-inmueble">
    <div>
      <h2 id="valores-del-inmueble" class="text-lg font-semibold">Valores</h2>
      <p class="text-sm text-tierra-500">
        Cada serie tiene su historial; rige el valor más reciente que ya empezó. Activos fijos toma el mayor de los dos
        para el tope de la depreciación fiscal.
      </p>
    </div>
    <SerieDeValores
      v-for="serie in series"
      :key="serie.fuente"
      :fuente="serie.fuente"
      :valores="serie.valores"
      :vigente="serie.vigente"
      @registrar="emit('registrar', serie.fuente)"
      @eliminar="emit('eliminar', $event)"
    />
    <VentanaDeValor
      v-model="edicion"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="emit('guardar')"
    />
  </section>
</template>
