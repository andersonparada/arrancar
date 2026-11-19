<script setup lang="ts">
import { CalendarCheck, CalendarClock } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import TarjetaDeCierre from '../componentes/depreciacion/TarjetaDeCierre.vue';
import VentanaDeRevisionDeCierre from '../componentes/depreciacion/VentanaDeRevisionDeCierre.vue';
import VentanaDeMotivo from '../componentes/comunes/VentanaDeMotivo.vue';
import { nombreDelMes } from '../composables/depreciacion/logica-de-cierre';
import { textoDeReapertura } from '../composables/depreciacion/usar-reapertura-de-mes';
import { usarCierreDeDepreciacion } from '../composables/depreciacion/usar-cierre-de-depreciacion';
import { VENTANAS_ACTIVOS_FIJOS } from '../textos';

const ventana = VENTANAS_ACTIVOS_FIJOS.depreciacion;
const { estado, cierres, reabrible, cargando, revision, reapertura } = usarCierreDeDepreciacion();
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" />

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <template v-else>
      <TarjetaBase v-if="estado.siguienteMes" class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs text-tierra-500">Siguiente mes por cerrar</p>
          <p class="text-xl font-semibold">{{ nombreDelMes(estado.siguienteMes) }}</p>
        </div>
        <BotonBase
          v-permiso="'activos-fijos.depreciacion.cerrar'"
          :icono="CalendarCheck"
          @click="revision.abrir(estado.siguienteMes)"
        >
          Revisar y cerrar
        </BotonBase>
      </TarjetaBase>
      <EstadoVacio
        v-else
        :icono="CalendarClock"
        titulo="Todavía no hay un mes por cerrar"
        descripcion="El primer mes es el de la fecha de inicio de la empresa o el del primer activo puesto en uso. Registre uno de los dos y vuelva."
      />

      <h2 v-if="cierres.length" class="text-sm font-semibold text-tierra-600 dark:text-tierra-300">Meses cerrados</h2>
      <ul v-if="cierres.length" class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <li v-for="cierre in cierres" :key="cierre.periodo">
          <TarjetaDeCierre
            :cierre="cierre"
            :reabrible="cierre.periodo === reabrible"
            @reabrir="reapertura.pedir(cierre.periodo)"
          />
        </li>
      </ul>
    </template>

    <VentanaDeRevisionDeCierre
      :abierta="revision.periodo.value !== null"
      :titulo="revision.titulo.value"
      :revision="revision.revision.value"
      :revisando="revision.revisando.value"
      :enviando="revision.enviando.value"
      @cerrar="revision.descartar"
      @confirmar="revision.cerrar"
    />
    <VentanaDeMotivo
      v-model:motivo="reapertura.motivo.value"
      :abierta="reapertura.periodo.value !== null"
      :titulo="`Reabrir ${nombreDelMes(reapertura.periodo.value ?? '')}`"
      :texto="textoDeReapertura(reapertura.periodo.value ?? '')"
      accion="Reabrir mes"
      :errores="reapertura.errores.value"
      :enviando="reapertura.enviando.value"
      @cerrar="reapertura.cerrar"
      @confirmar="reapertura.confirmar"
    />
  </div>
</template>
