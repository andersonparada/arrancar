<script setup lang="ts">
import { computed } from 'vue';
import { CalendarRange, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { detallesDeVigenciaDeCombustible } from '../../composables/vigencias-de-combustible/detalles-de-vigencia-de-combustible';
import { esTasaVigente } from '../../composables/vigencias-de-combustible/reglas-de-vigencia-de-combustible';
import type { VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';
import { formatearFecha } from '@/modulos/core/utilidades/formato';

/** La historia de tasas de IDP de un combustible, de la más reciente a la más antigua. */
const props = defineProps<{ combustible: string | null; tasas: VigenciaDeCombustible[] }>();
defineEmits<{
  cerrar: [];
  nueva: [];
  editar: [tasa: VigenciaDeCombustible];
  eliminar: [tasa: VigenciaDeCombustible];
}>();

const hayVigente = computed(() => props.tasas.some(esTasaVigente));
const PERMISO = 'libro-de-compras.vigencias-de-combustible';
</script>

<template>
  <VentanaModal
    ancha
    :abierta="combustible !== null"
    :titulo="`Tasas de IDP · ${combustible ?? ''}`"
    @cerrar="$emit('cerrar')"
  >
    <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        <template v-if="hayVigente">Registrar una tasa nueva cierra la vigente el día anterior a su inicio.</template>
        <template v-else>Este combustible no tiene tasa vigente.</template>
      </p>
      <BotonBase v-permiso="`${PERMISO}.crear`" :icono="Plus" @click="$emit('nueva')">Registrar tasa nueva</BotonBase>
    </div>

    <EstadoVacio
      v-if="!tasas.length"
      :icono="CalendarRange"
      titulo="Todavía no hay tasas"
      descripcion="Registre la tasa de IDP por galón y desde qué fecha rige, para calcular el impuesto de cada compra."
    />
    <ul v-else class="grid gap-3 sm:grid-cols-2">
      <li v-for="tasa in tasas" :key="tasa.id">
        <TarjetaDeRegistro
          :titulo="`Desde ${formatearFecha(tasa.vigenteDesde)}`"
          :detalles="detallesDeVigenciaDeCombustible(tasa)"
          :permiso="`${PERMISO}.editar`"
          :permiso-eliminar="`${PERMISO}.eliminar`"
          :insignia="esTasaVigente(tasa) ? 'Vigente' : undefined"
          eliminable
          @editar="$emit('editar', tasa)"
          @eliminar="$emit('eliminar', tasa)"
        />
      </li>
    </ul>
  </VentanaModal>
</template>
