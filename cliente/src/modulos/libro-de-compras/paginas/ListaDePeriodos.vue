<script setup lang="ts">
import { CalendarCheck } from 'lucide-vue-next';
import { reactive } from 'vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import VentanaDeMotivo from '../componentes/retenciones/VentanaDeMotivo.vue';
import ControlDeBloqueo from '../componentes/periodos/ControlDeBloqueo.vue';
import TarjetaDePeriodo from '../componentes/periodos/TarjetaDePeriodo.vue';
import { usarPeriodos } from '../composables/periodos/usar-periodos';
import { CONTROL_DE_PERIODOS, VENTANA_DE_PERIODOS as textos } from '../textos-de-periodos';

/** Los doce meses del año con su estado, y el bloqueo de períodos declarados. */
const periodos = usarPeriodos();
const { anio, vista, cargando } = periodos;
const apagado = reactive(periodos.control.apagado);
</script>

<template>
  <div class="min-w-0">
    <EncabezadoPagina :titulo="textos.titulo" :descripcion="textos.descripcion" />

    <p v-if="cargando && !vista" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <div v-else-if="vista" class="space-y-4">
      <ControlDeBloqueo
        :control="vista.control"
        :ocupado="cargando"
        @encender="periodos.control.encender"
        @apagar="apagado.abrir(true)"
      />
      <div class="max-w-xs">
        <CampoSelector v-model="anio" :etiqueta="textos.anio" :opciones="periodos.opcionesDeAnio.value" />
      </div>
      <ul
        v-if="vista.periodos.length > 0"
        class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        :class="{ 'opacity-60': cargando }"
        :aria-busy="cargando"
      >
        <li v-for="periodo in vista.periodos" :key="periodo.periodo" class="min-w-0">
          <TarjetaDePeriodo :periodo="periodo" />
        </li>
      </ul>
      <EstadoVacio v-else :icono="CalendarCheck" :titulo="textos.vacio" />
    </div>

    <VentanaDeMotivo
      v-model="apagado.motivo"
      :abierta="apagado.abierta"
      :titulo="CONTROL_DE_PERIODOS.apagarTitulo"
      :resumen="[...CONTROL_DE_PERIODOS.apagarResumen]"
      :ayuda="CONTROL_DE_PERIODOS.apagarAyuda"
      :boton="CONTROL_DE_PERIODOS.apagar"
      :enviando="apagado.enviando"
      :errores="apagado.errores"
      @guardar="apagado.guardar"
      @cerrar="apagado.abierta = false"
    />
  </div>
</template>
