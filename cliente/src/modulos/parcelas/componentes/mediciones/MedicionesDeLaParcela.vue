<script setup lang="ts">
import { computed } from 'vue';
import { Plus, Ruler, X } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { detallesDeMedicion } from '../../composables/mediciones/detalles-de-medicion';
import { hoyEnIso, medicionQueRige } from '../../composables/mediciones/edicion-de-medicion';
import type { MostrarSuperficie } from '../../composables/parcelas/detalles-de-parcela';
import type { Medicion } from '../../servicios/mediciones.api';

/**
 * La pestaña «Mediciones» de la ficha: el historial de la superficie, de la más reciente a la más antigua. Una medición
 * no se edita ni se borra: se registra otra con otra fecha, o se anula con su motivo.
 */
const props = defineProps<{ mediciones: Medicion[]; mostrar: MostrarSuperficie }>();
const emit = defineEmits<{ registrar: []; anular: [medicion: Medicion] }>();

const quienRige = computed(() => medicionQueRige(props.mediciones, hoyEnIso())?.id);
const insigniaDe = (medicion: Medicion): string | undefined => {
  if (medicion.estado === 'anulada') return 'Anulada';
  return medicion.id === quienRige.value ? 'Rige hoy' : undefined;
};
</script>

<template>
  <section class="space-y-3" aria-labelledby="mediciones-de-la-parcela">
    <div class="flex items-center justify-between gap-2">
      <h2 id="mediciones-de-la-parcela" class="text-lg font-semibold">Mediciones</h2>
      <BotonBase v-permiso="'parcelas.mediciones.crear'" variante="secundario" :icono="Plus" @click="emit('registrar')">
        Registrar medición
      </BotonBase>
    </div>
    <EstadoVacio
      v-if="!mediciones.length"
      :icono="Ruler"
      titulo="Esta parcela todavía no tiene medición"
      descripcion="Registre la superficie tal como la lee de su escritura o su plano, en cuerdas, manzanas o la unidad que use. El sistema la convierte."
    />
    <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <li v-for="medicion in mediciones" :key="medicion.id">
        <TarjetaDeRegistro
          :titulo="`Vigente desde ${formatearFecha(medicion.vigenteDesde)}`"
          :detalles="detallesDeMedicion(medicion, mostrar)"
          :insignia="insigniaDe(medicion)"
          permiso="parcelas.mediciones.anular"
          sin-editar
        >
          <template #acciones-extra>
            <span v-if="medicion.estado === 'vigente'" v-permiso="'parcelas.mediciones.anular'" class="contents">
              <BotonBase variante="fantasma" pequeno :icono="X" @click="emit('anular', medicion)">Anular</BotonBase>
            </span>
          </template>
        </TarjetaDeRegistro>
      </li>
    </ul>
  </section>
</template>
