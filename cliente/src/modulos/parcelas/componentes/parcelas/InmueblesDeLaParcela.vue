<script setup lang="ts">
import { Landmark, Pencil } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import type { MostrarSuperficie } from '../../composables/parcelas/detalles-de-parcela';
import type { InmuebleDeParcela } from '../../servicios/parcelas.api';

/**
 * La pestaña «Inmuebles» de la ficha: las fincas registrales sobre las que está la parcela y cuánto de cada una abarca.
 * Ligarlas o quitarlas se hace al editar la parcela.
 */
defineProps<{ inmuebles: InmuebleDeParcela[]; mostrar: MostrarSuperficie }>();
const emit = defineEmits<{ editar: [] }>();
</script>

<template>
  <section class="space-y-3" aria-labelledby="inmuebles-de-la-parcela">
    <div class="flex items-center justify-between gap-2">
      <h2 id="inmuebles-de-la-parcela" class="text-lg font-semibold">Inmuebles</h2>
      <BotonBase v-permiso="'parcelas.parcelas.editar'" variante="secundario" :icono="Pencil" @click="emit('editar')">
        Ligar inmuebles
      </BotonBase>
    </div>
    <EstadoVacio
      v-if="!inmuebles.length"
      :icono="Landmark"
      titulo="Esta parcela no está ligada a ningún inmueble"
      descripcion="Ligue la finca registral (con su folio y libro) sobre la que está la parcela. Una parcela puede abarcar varias fincas, y una finca puede tener varias parcelas."
    />
    <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <li v-for="inmueble in inmuebles" :key="inmueble.inmuebleId">
        <TarjetaDeRegistro
          :titulo="inmueble.inmuebleNombre"
          :detalles="[{ etiqueta: 'Porción que abarca', valor: mostrar(inmueble.superficieM2) }]"
          permiso="parcelas.parcelas.editar"
          sin-editar
        />
      </li>
    </ul>
  </section>
</template>
