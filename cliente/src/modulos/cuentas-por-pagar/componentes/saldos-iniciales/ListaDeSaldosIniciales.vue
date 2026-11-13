<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import type { SaldoInicial } from '../../servicios/tipos-de-saldos-iniciales';
import PaginacionDeLista from '../PaginacionDeLista.vue';
import TarjetaDeSaldoInicial from './TarjetaDeSaldoInicial.vue';

/** Las tarjetas de los saldos con su estado vacío (distinto si hay un proveedor escogido) y su paginación. */
defineProps<{
  saldos: SaldoInicial[];
  cargando: boolean;
  filtrando: boolean;
  paginas: number;
  limite: number;
  total: number;
}>();
defineEmits<{ corregir: [saldo: SaldoInicial]; eliminar: [saldo: SaldoInicial] }>();
const pagina = defineModel<number>('pagina', { required: true });
</script>

<template>
  <p v-if="cargando && saldos.length === 0" class="text-sm text-tierra-500" role="status">Cargando…</p>
  <EstadoVacio
    v-else-if="saldos.length === 0"
    :icono="Inbox"
    :titulo="filtrando ? 'Este proveedor no tiene saldos iniciales' : 'Todavía no hay saldos iniciales'"
    :descripcion="
      filtrando
        ? 'Escoja «Todos los proveedores» para ver el resto.'
        : 'Cargue uno por uno, o impórtelos todos desde Excel: se revisan antes de guardar y, si una fila falla, no se guarda ninguna.'
    "
  />
  <template v-else>
    <ul
      class="grid grid-cols-1 gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3"
      :class="{ 'opacity-60': cargando }"
      :aria-busy="cargando"
    >
      <li v-for="saldo in saldos" :key="saldo.id">
        <TarjetaDeSaldoInicial
          :saldo="saldo"
          @corregir="$emit('corregir', saldo)"
          @eliminar="$emit('eliminar', saldo)"
        />
      </li>
    </ul>
    <PaginacionDeLista v-model="pagina" :paginas="paginas" :limite="limite" :total="total" />
  </template>
</template>
