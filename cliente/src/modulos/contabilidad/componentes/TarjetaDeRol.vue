<script setup lang="ts">
import { computed } from 'vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { filasDeRol, type FilaDeEnlace } from '../composables/edicion-de-enlaces';
import type { Cuenta } from '../servicios/cuentas.api';
import type { LlaveDeEnlace, RolDeEnlace } from '../servicios/enlaces.api';
import FilaDeEnlaceDelRol from './FilaDeEnlace.vue';

/** Un rol de sistema con una fila por cada cuenta que necesita (la general o una por registro de otro módulo). */
const props = defineProps<{
  rol: RolDeEnlace;
  llaves: LlaveDeEnlace[];
  cuentas: Cuenta[];
  puedeEditar: boolean;
  ocupadas: ReadonlySet<string>;
}>();
const emit = defineEmits<{ elegir: [fila: FilaDeEnlace, cuentaId: string]; quitar: [fila: FilaDeEnlace] }>();

const filas = computed(() => filasDeRol(props.rol, props.llaves));
const estaOcupada = (fila: FilaDeEnlace): boolean => props.ocupadas.has(`${props.rol.rol}|${fila.llave ?? ''}`);
</script>

<template>
  <TarjetaBase>
    <div class="flex flex-wrap items-center gap-2">
      <h3 class="font-semibold">{{ rol.nombre }}</h3>
      <InsigniaBase v-if="rol.esDeAuxiliar" tono="trigo">Cuenta de control</InsigniaBase>
      <InsigniaBase v-if="rol.admiteLlave && rol.nombreDeLlave">Por {{ rol.nombreDeLlave.toLowerCase() }}</InsigniaBase>
    </div>
    <p v-if="rol.esDeAuxiliar" class="mt-1 text-xs text-tierra-600 dark:text-tierra-300">
      Al enlazarla, la cuenta queda marcada como cuenta de control: su detalle lo lleva el módulo.
    </p>
    <ul class="mt-2 divide-y divide-tierra-100 dark:divide-tierra-800">
      <FilaDeEnlaceDelRol
        v-for="fila in filas"
        :key="fila.llave ?? 'todos'"
        :fila="fila"
        :cuentas="cuentas"
        :puede-editar="puedeEditar"
        :ocupada="estaOcupada(fila)"
        @elegir="(cuentaId) => emit('elegir', fila, cuentaId)"
        @quitar="emit('quitar', fila)"
      />
    </ul>
  </TarjetaBase>
</template>
