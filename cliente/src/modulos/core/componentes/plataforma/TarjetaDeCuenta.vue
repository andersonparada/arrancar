<script setup lang="ts">
import { Blocks } from 'lucide-vue-next';
import type { CuentaPlataforma } from '../../servicios/plataforma.api';
import { formatearFechaHora } from '../../utilidades/formato';
import BotonBase from '../BotonBase.vue';
import InsigniaBase from '../InsigniaBase.vue';
import TarjetaBase from '../TarjetaBase.vue';

defineProps<{ cuenta: CuentaPlataforma }>();
const emit = defineEmits<{ modulos: []; cambiarEstado: [] }>();
</script>

<template>
  <TarjetaBase class="flex h-full flex-col gap-3">
    <div class="flex items-start justify-between gap-2">
      <div>
        <p class="font-semibold">{{ cuenta.nombre }}</p>
        <p class="text-sm text-tierra-500">
          {{ cuenta.totalEmpresas }} empresas · desde {{ formatearFechaHora(cuenta.creadoEn) }}
        </p>
      </div>
      <InsigniaBase :tono="cuenta.activa ? 'campo' : 'rojo'">{{
        cuenta.activa ? 'Activa' : 'Suspendida'
      }}</InsigniaBase>
    </div>
    <div class="mt-auto flex flex-wrap justify-end gap-2">
      <BotonBase variante="secundario" pequeno :icono="Blocks" @click="emit('modulos')">Módulos</BotonBase>
      <BotonBase variante="fantasma" pequeno @click="emit('cambiarEstado')">
        {{ cuenta.activa ? 'Suspender' : 'Reactivar' }}
      </BotonBase>
    </div>
  </TarjetaBase>
</template>
