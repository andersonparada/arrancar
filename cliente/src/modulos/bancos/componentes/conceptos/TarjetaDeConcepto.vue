<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { detallesDeConcepto } from '../../composables/conceptos/detalles-de-concepto';
import { accionesDeConcepto, esDeSistema } from '../../composables/conceptos/reglas-de-concepto';
import type { Concepto } from '../../servicios/conceptos.api';

/**
 * El concepto en la lista. Los del sistema llevan la insignia «Del sistema» y ninguna acción; los del
 * usuario se editan, inactivan o reactivan y se eliminan.
 */
const props = defineProps<{ registro: Concepto }>();
const emit = defineEmits<{ editar: []; eliminar: []; 'cambiar-estado': [] }>();

const acciones = computed(() => accionesDeConcepto(props.registro));
</script>

<template>
  <TarjetaDeRegistro
    :titulo="registro.nombre"
    :detalles="detallesDeConcepto(registro)"
    permiso="bancos.conceptos.gestionar"
    :inactivo="!registro.activo"
    :insignia="esDeSistema(registro) ? 'Del sistema' : undefined"
    :sin-editar="!acciones.editar"
    :eliminable="acciones.eliminar"
    @editar="emit('editar')"
    @eliminar="emit('eliminar')"
  >
    <template v-if="acciones.cambiarEstado" #acciones-extra>
      <BotonBase v-permiso="'bancos.conceptos.gestionar'" variante="fantasma" pequeno @click="emit('cambiar-estado')">
        {{ registro.activo ? 'Inactivar' : 'Reactivar' }}
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
