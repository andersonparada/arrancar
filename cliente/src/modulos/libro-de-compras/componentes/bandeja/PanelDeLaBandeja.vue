<script setup lang="ts">
import { computed } from 'vue';
import { Inbox } from 'lucide-vue-next';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import {
  cantidadDeFiltrosDeLaBandeja,
  FILAS_POR_PAGINA,
  resumenDeLaSeleccion,
} from '../../composables/bandeja/datos-de-la-bandeja';
import { algunaPideLaRecepcion } from '../../composables/bandeja/datos-de-completar';
import { usarBandeja } from '../../composables/bandeja/usar-bandeja';
import { paginasEnTotal } from '../../composables/documentos/filtros-de-documentos';
import type { EstadoDeDte } from '../../servicios/dte-recibidos.api';
import { PESTANAS_DE_LA_BANDEJA, VACIO_DE_LA_BANDEJA, VACIO_POR_PESTANA } from '../../textos-de-la-bandeja';
import PaginacionDeLista from '../documentos/PaginacionDeLista.vue';
import BarraDeSeleccionDeLaBandeja from './BarraDeSeleccionDeLaBandeja.vue';
import FiltrosDeLaBandeja from './FiltrosDeLaBandeja.vue';
import TarjetaDeDteRecibido from './TarjetaDeDteRecibido.vue';
import VentanaDeCompletarDte from './VentanaDeCompletarDte.vue';
import VentanaDeConfirmarDte from './VentanaDeConfirmarDte.vue';
import VentanaDeDescarteDeDte from './VentanaDeDescarteDeDte.vue';

/** Una pestaña de la bandeja por estado: la lista con sus filtros, lo marcado y las ventanas de completar, confirmar y descartar. */
const props = defineProps<{ estado: EstadoDeDte; busquedaInicial: string }>();
const bandeja = usarBandeja(props.estado, props.busquedaInicial);
const { filtros, filas, total, cargando, pagina, seleccion, marcadas, completar, confirmacion, descarte } = bandeja;
const explicacion = PESTANAS_DE_LA_BANDEJA.find(({ clave }) => clave === props.estado)?.explicacion;
const resumen = computed(() => resumenDeLaSeleccion(marcadas.value));
const sinFiltros = computed(() => cantidadDeFiltrosDeLaBandeja(filtros) === 0);
const vacio = computed(() =>
  sinFiltros.value && props.estado === 'pendiente'
    ? VACIO_DE_LA_BANDEJA
    : { titulo: sinFiltros.value ? VACIO_POR_PESTANA[props.estado] : 'No hay DTE con estos filtros', descripcion: '' },
);
</script>

<template>
  <div id="panel-de-la-bandeja" role="tabpanel">
    <p v-if="explicacion" class="mb-4 text-sm text-tierra-600 dark:text-tierra-300">{{ explicacion }}</p>
    <FiltrosDeLaBandeja v-model="filtros" @quitar="bandeja.quitarFiltros" />

    <p v-if="cargando && filas.length === 0" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <EstadoVacio
      v-else-if="filas.length === 0"
      :icono="Inbox"
      :titulo="vacio.titulo"
      :descripcion="vacio.descripcion"
    />
    <template v-else>
      <label v-if="bandeja.sePuedeMarcar" class="mb-3 flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          class="size-5 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
          :checked="bandeja.todasMarcadas.value"
          @change="bandeja.alternarTodas"
        />
        Marcar todas las de esta página
      </label>
      <ul
        class="grid gap-3 transition-opacity md:grid-cols-2"
        :class="{ 'opacity-60': cargando }"
        :aria-busy="cargando"
      >
        <li v-for="fila in filas" :key="fila.id">
          <TarjetaDeDteRecibido
            :fila="fila"
            :conceptos="bandeja.nombresDeConceptos.value"
            :marcable="bandeja.sePuedeMarcar"
            :marcada="seleccion.estaMarcada(fila.id)"
            @alternar="seleccion.alternar(fila.id)"
            @descartar="descarte.abrir([fila.id])"
            @restaurar="descarte.restaurar(fila.id)"
          />
        </li>
      </ul>
    </template>
    <PaginacionDeLista
      v-model="pagina"
      :paginas="paginasEnTotal(total, FILAS_POR_PAGINA)"
      :limite="FILAS_POR_PAGINA"
      :total="total"
    />

    <BarraDeSeleccionDeLaBandeja
      v-if="bandeja.sePuedeMarcar && filas.length"
      :resumen="resumen"
      :solo-descartar="estado !== 'pendiente'"
      @quitar="seleccion.limpiar"
      @completar="completar.abrir(marcadas)"
      @confirmar="confirmacion.abrir(marcadas)"
      @descartar="descarte.abrir(marcadas.map(({ id }) => id))"
    />

    <VentanaDeCompletarDte
      v-model="completar.edicion.value"
      :cantidad="completar.cantidad.value"
      :conceptos="bandeja.opcionesDeConceptos.value"
      :destinos="bandeja.opcionesDeDestinos.value"
      :facturas="completar.facturas.value"
      :pide-la-recepcion="algunaPideLaRecepcion(completar.filas.value)"
      :errores="completar.errores.value"
      :enviando="completar.enviando.value"
      @cerrar="completar.cerrar"
      @guardar="completar.guardar"
    />
    <VentanaDeConfirmarDte
      v-model="confirmacion.previa.respuestas.value"
      :abierta="confirmacion.abierta.value"
      :filas="confirmacion.filas.value"
      :resumen="confirmacion.resumen.value"
      :calculando="confirmacion.previa.calculando.value"
      :enviando="confirmacion.enviando.value"
      :listas="confirmacion.previa.listas.value"
      :con-error="confirmacion.previa.conError.value"
      :proveedores="confirmacion.previa.proveedores.value"
      :falta-contestar="confirmacion.previa.faltaContestar.value"
      :resultado="confirmacion.resultado.value"
      @cerrar="confirmacion.cerrar"
      @confirmar="confirmacion.confirmar"
      @recalcular="confirmacion.previa.calcular"
    />
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
