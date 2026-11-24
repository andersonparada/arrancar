<script setup lang="ts">
import { computed } from 'vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { filasDeRol, type FilaDeEnlace, type LlavesDelRol } from '../composables/edicion-de-enlaces';
import type { Cuenta } from '../servicios/cuentas.api';
import type { RolDeEnlace } from '../servicios/enlaces.api';
import FilaDeEnlaceDelRol from './FilaDeEnlace.vue';

/** Un rol de sistema con una fila por cada cuenta que necesita (la general o una por registro de otro módulo). */
const props = defineProps<{
  rol: RolDeEnlace;
  llaves: LlavesDelRol;
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
    <p
      v-if="rol.admiteLlave && llaves === null"
      class="mt-2 rounded-lg bg-trigo-300/30 px-3 py-2 text-xs text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
      role="status"
    >
      No se pudo traer la lista de {{ rol.nombreDeLlave?.toLowerCase() ?? 'registros' }}. Recargue la página para verla;
      mientras tanto no se marca ningún enlace como huérfano.
    </p>
    <p v-if="rol.opcional" class="mt-1 text-xs text-tierra-600 dark:text-tierra-300">
      Opcional: sin cuenta, este importe va al costo de cada línea.
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
