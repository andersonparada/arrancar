<script setup lang="ts">
import { Lock, LockOpen } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFechaHora } from '@/modulos/core/utilidades/formato';
import type { ControlDePeriodos } from '../../servicios/periodos.api';
import { CONTROL_DE_PERIODOS as textos } from '../../textos-de-periodos';

/**
 * El bloqueo de períodos declarados, con lo que bloquea y lo que no. Encenderlo exige el permiso de declarar;
 * apagarlo, el de reabrir.
 */
defineProps<{ control: ControlDePeriodos; ocupado: boolean }>();
defineEmits<{ encender: []; apagar: [] }>();
</script>

<template>
  <TarjetaBase>
    <section aria-labelledby="titulo-del-bloqueo" class="space-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <component
          :is="control.encendido ? Lock : LockOpen"
          class="size-5 text-campo-700 dark:text-campo-300"
          aria-hidden="true"
        />
        <h2 id="titulo-del-bloqueo" class="font-semibold">{{ textos.titulo }}</h2>
        <InsigniaBase :tono="control.encendido ? 'campo' : 'trigo'">
          {{ control.encendido ? textos.encendido : textos.apagado }}
        </InsigniaBase>
        <div class="flex w-full sm:ml-auto sm:w-auto">
          <BotonBase
            v-if="control.encendido"
            v-permiso="'libro-de-compras.periodos.reabrir'"
            variante="secundario"
            class="w-full sm:w-auto"
            :deshabilitado="ocupado"
            @click="$emit('apagar')"
          >
            {{ textos.apagar }}
          </BotonBase>
          <BotonBase
            v-else
            v-permiso="'libro-de-compras.periodos.declarar'"
            class="w-full sm:w-auto"
            :cargando="ocupado"
            @click="$emit('encender')"
          >
            {{ textos.encender }}
          </BotonBase>
        </div>
      </div>
      <p class="text-sm">
        {{ control.encendido ? textos.explicacionEncendido : textos.explicacionApagado }}
      </p>
      <p class="text-xs text-tierra-600 dark:text-tierra-300">{{ textos.noBloquea }}</p>
      <p v-if="control.actualizadoEn" class="text-xs text-tierra-500">
        {{ textos.actualizadoPor }} el {{ formatearFechaHora(control.actualizadoEn)
        }}<template v-if="control.actualizadoPor"> por {{ control.actualizadoPor.nombre }}</template
        >.
      </p>
    </section>
  </TarjetaBase>
</template>
