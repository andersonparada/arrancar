<script setup lang="ts">
import { computed } from 'vue';
import { ExternalLink, Plus, TriangleAlert } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import {
  detallesDeParcela,
  enlacesDelPunto,
  insigniaDeParcela,
  resumenDeParcela,
  type MostrarSuperficie,
} from '../../composables/parcelas/detalles-de-parcela';
import type { FichaDeParcela, Parcela } from '../../servicios/parcelas.api';

/** La pestaña «Datos» de la ficha: los avisos del servidor, los datos de la parcela, su punto en el mapa y sus subparcelas. */
const props = defineProps<{ parcela: FichaDeParcela; subparcelas: Parcela[]; mostrar: MostrarSuperficie }>();
const emit = defineEmits<{ nuevaSubparcela: [] }>();
const enlaces = computed(() => enlacesDelPunto(props.parcela));
</script>

<template>
  <div class="space-y-6">
    <ul v-if="parcela.avisos.length" class="space-y-2" aria-label="Avisos de la parcela">
      <li
        v-for="aviso in parcela.avisos"
        :key="aviso"
        class="flex items-start gap-2 rounded-xl bg-trigo-300/30 px-3 py-2 text-sm text-tierra-900 dark:bg-trigo-500/15 dark:text-trigo-300"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ aviso }}</span>
      </li>
    </ul>

    <DatosDelRegistro :detalles="detallesDeParcela(parcela, mostrar)" />
    <p v-if="enlaces" class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <a
        :href="enlaces.mapa"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-campo-700 underline dark:text-campo-300"
      >
        Ver el punto en el mapa <ExternalLink class="size-3.5" aria-hidden="true" />
      </a>
      <a :href="enlaces.geo" class="text-campo-700 underline dark:text-campo-300"
        >Abrir en la aplicación de mapas del teléfono</a
      >
    </p>

    <section class="space-y-3" aria-labelledby="subparcelas-de-la-parcela">
      <div class="flex items-center justify-between gap-2">
        <h2 id="subparcelas-de-la-parcela" class="text-lg font-semibold">Subparcelas</h2>
        <BotonBase
          v-permiso="'parcelas.parcelas.crear'"
          variante="secundario"
          :icono="Plus"
          @click="emit('nuevaSubparcela')"
        >
          Agregar subparcela
        </BotonBase>
      </div>
      <p v-if="!subparcelas.length" class="text-sm text-tierra-500">
        Esta parcela no tiene subparcelas. Agregue una si la divide en tablones o cuadros.
      </p>
      <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <li v-for="hija in subparcelas" :key="hija.id">
          <TarjetaDeRegistro
            :titulo="`${hija.codigo} · ${hija.nombre}`"
            :detalles="resumenDeParcela(hija, mostrar)"
            permiso="parcelas.parcelas.editar"
            :inactivo="!hija.activo"
            :insignia="insigniaDeParcela(hija)"
            :destino="{ name: 'parcelas.parcelas.ficha', params: { parcelaId: hija.id } }"
          />
        </li>
      </ul>
    </section>
  </div>
</template>
