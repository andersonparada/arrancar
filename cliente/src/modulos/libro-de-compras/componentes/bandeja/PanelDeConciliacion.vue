<script setup lang="ts">
import { computed } from 'vue';
import { CircleCheckBig, SearchX } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { numeroDelItem } from '../../composables/bandeja/datos-de-la-conciliacion';
import { usarConciliacion } from '../../composables/bandeja/usar-conciliacion';
import { opcionesDePeriodoDelLibro } from '../../composables/libro/datos-del-libro';
import type { ItemDeConciliacion } from '../../servicios/conciliacion.api';
import {
  CONCILIACION as textos,
  TARJETAS_DE_CONCILIACION,
  type AccionDeConciliacion,
} from '../../textos-de-la-conciliacion';
import LineaDeConciliacion from './LineaDeConciliacion.vue';
import TarjetasDeConciliacion from './TarjetasDeConciliacion.vue';
import VentanaDeDescarteDeDte from './VentanaDeDescarteDeDte.vue';

/** La conciliación de un mes: qué cuadra con la SAT, qué difiere y qué falta de cada lado. Solo consulta; nada se guarda. */
const emit = defineEmits<{ verEnLaBandeja: [busqueda: string] }>();
const router = useRouter();
const { periodo, conciliacion, grupo, cargando, descarte, porRevisar, hayAlgo } = usarConciliacion();
const periodos = computed(() => opcionesDePeriodoDelLibro(new Date(), periodo.value));
const tarjeta = computed(() => TARJETAS_DE_CONCILIACION.find(({ clave }) => clave === grupo.value));
const items = computed(() => conciliacion.value?.resultados[grupo.value] ?? []);

function alHacer(accion: AccionDeConciliacion, item: ItemDeConciliacion): void {
  if (accion === 'abrirDocumento' && item.documentoId) {
    void router.push({ name: 'libro-de-compras.documentos.ficha', params: { documentoId: item.documentoId } });
  } else if (accion === 'verEnLaBandeja') emit('verEnLaBandeja', numeroDelItem(item));
  else if (accion === 'descartar' && item.dteId) descarte.abrir([item.dteId]);
  else if (accion === 'restaurar' && item.dteId) void descarte.restaurar(item.dteId);
}
</script>

<template>
  <div id="panel-de-la-bandeja" role="tabpanel">
    <p class="mb-4 text-sm text-tierra-600 dark:text-tierra-300">{{ textos.descripcion }}</p>
    <div class="mb-4 max-w-xs">
      <CampoSelector v-model="periodo" :etiqueta="textos.periodo" :opciones="periodos" />
    </div>

    <p v-if="cargando && !conciliacion" class="text-sm text-tierra-500" role="status">{{ textos.cargando }}</p>
    <template v-else-if="conciliacion">
      <p
        v-if="!conciliacion.hayDatosDeLaSat"
        class="mb-4 rounded-2xl bg-trigo-300/40 p-4 text-sm text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
        role="status"
      >
        {{ textos.sinDatos }}
      </p>
      <p v-else-if="hayAlgo" class="mb-4 text-sm font-medium" role="status">
        {{ porRevisar === 0 ? textos.todoCuadra : textos.porRevisar }}
      </p>
      <TarjetasDeConciliacion v-model="grupo" :resumen="conciliacion.resumen" />
      <p v-if="tarjeta" class="mb-3 text-sm text-tierra-600 dark:text-tierra-300">{{ tarjeta.explicacion }}</p>
      <EstadoVacio
        v-if="items.length === 0"
        :icono="grupo === 'cuadra' ? SearchX : CircleCheckBig"
        :titulo="textos.vacia"
      />
      <ul
        v-else
        class="grid grid-cols-1 gap-3 md:grid-cols-2"
        :class="{ 'opacity-60': cargando }"
        :aria-busy="cargando"
      >
        <li v-for="item in items" :key="`${item.documentoId}-${item.dteId}-${item.numero}`">
          <LineaDeConciliacion :clave="grupo" :item="item" @accion="alHacer($event, item)" />
        </li>
      </ul>
    </template>

    <VentanaDeDescarteDeDte
      v-model="descarte.motivo.value"
      :abierta="descarte.abierta.value"
      :cantidad="descarte.ids.value.length"
      :errores="descarte.errores.value"
      :enviando="descarte.enviando.value"
      @cerrar="descarte.cerrar"
      @descartar="descarte.descartar"
    />
  </div>
</template>
