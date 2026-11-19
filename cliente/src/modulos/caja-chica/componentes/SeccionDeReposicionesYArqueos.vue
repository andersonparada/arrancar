<script setup lang="ts">
import { Ban, Printer } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import {
  detallesDeArqueo,
  detallesDeReposicion,
  marcaDeArqueo,
  marcaDeReposicion,
} from '../composables/movimientos/detalles-de-movimientos';
import type { ArqueoResumen } from '../servicios/tipos-de-arqueos';
import type { ReposicionResumen } from '../servicios/tipos-de-reposiciones';
import EnlaceComoBoton from './EnlaceComoBoton.vue';
import SeccionPlegable from './SeccionPlegable.vue';
import TarjetaDeMovimiento from './TarjetaDeMovimiento.vue';

/**
 * Las reposiciones y los arqueos del fondo, del más nuevo al más viejo: cada uno se imprime y, mientras esté vigente,
 * se puede anular con su motivo. El servidor explica por qué no cuando algo lo impide (cheque cobrado, faltante repuesto).
 */
defineProps<{ reposiciones: ReposicionResumen[]; arqueos: ArqueoResumen[]; puedeCambiar: boolean }>();
const emit = defineEmits<{
  anularReposicion: [reposicion: ReposicionResumen];
  anularArqueo: [arqueo: ArqueoResumen];
}>();

const notasDeReposicion = (reposicion: ReposicionResumen): string[] => [
  ...(reposicion.laHizoElCustodio ? ['La hizo el mismo custodio del fondo.'] : []),
  ...(reposicion.motivoDeAnulacion ? [`Anulada: ${reposicion.motivoDeAnulacion}`] : []),
];
const notasDeArqueo = (arqueo: ArqueoResumen): string[] => [
  ...(arqueo.loHizoElCustodio ? ['Lo hizo el mismo custodio del fondo.'] : []),
  ...(arqueo.motivoDeAnulacion ? [`Anulado: ${arqueo.motivoDeAnulacion}`] : []),
];
</script>

<template>
  <SeccionPlegable titulo="Reposiciones" :cantidad="reposiciones.length">
    <p v-if="reposiciones.length === 0" class="text-sm text-tierra-600 dark:text-tierra-300">
      Todavía no se ha repuesto este fondo. Use «Reponer» cuando haya comprobantes pendientes.
    </p>
    <ul v-else class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <li v-for="reposicion in reposiciones" :key="reposicion.id">
        <TarjetaDeMovimiento
          :titulo="`Reposición ${reposicion.numero}`"
          :marca="marcaDeReposicion(reposicion)"
          :detalles="detallesDeReposicion(reposicion)"
          :notas="notasDeReposicion(reposicion)"
          :anulado="reposicion.estado === 'anulada'"
        >
          <EnlaceComoBoton
            pequeno
            :icono="Printer"
            :to="{ name: 'caja-chica.reposiciones.imprimir', params: { id: reposicion.id } }"
          >
            Imprimir
          </EnlaceComoBoton>
          <BotonBase
            v-if="reposicion.estado === 'vigente' && puedeCambiar"
            v-permiso="'caja-chica.reposiciones.anular'"
            variante="secundario"
            pequeno
            :icono="Ban"
            @click="emit('anularReposicion', reposicion)"
          >
            Anular
          </BotonBase>
        </TarjetaDeMovimiento>
      </li>
    </ul>
  </SeccionPlegable>

  <SeccionPlegable titulo="Arqueos" :cantidad="arqueos.length">
    <p v-if="arqueos.length === 0" class="text-sm text-tierra-600 dark:text-tierra-300">
      Este fondo todavía no se ha arqueado. Cuente el efectivo con «Arquear» para dejar constancia.
    </p>
    <ul v-else class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <li v-for="arqueo in arqueos" :key="arqueo.id">
        <TarjetaDeMovimiento
          :titulo="`Arqueo ${arqueo.numero}`"
          :marca="marcaDeArqueo(arqueo)"
          :detalles="detallesDeArqueo(arqueo)"
          :notas="notasDeArqueo(arqueo)"
          :anulado="arqueo.estado === 'anulado'"
        >
          <EnlaceComoBoton
            pequeno
            :icono="Printer"
            :to="{ name: 'caja-chica.arqueos.imprimir', params: { id: arqueo.id } }"
          >
            Acta
          </EnlaceComoBoton>
          <BotonBase
            v-if="arqueo.estado === 'vigente' && puedeCambiar"
            v-permiso="'caja-chica.arqueos.anular'"
            variante="secundario"
            pequeno
            :icono="Ban"
            @click="emit('anularArqueo', arqueo)"
          >
            Anular
          </BotonBase>
        </TarjetaDeMovimiento>
      </li>
    </ul>
  </SeccionPlegable>
</template>
