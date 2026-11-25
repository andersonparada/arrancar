<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { detallesDeConceptoDeIngreso } from '../../composables/conceptos-de-ingreso/detalles-de-concepto-de-ingreso';
import {
  esDeSistema,
  EXPLICACION_DE_SISTEMA,
} from '../../composables/conceptos-de-ingreso/reglas-de-concepto-de-ingreso';
import type { ConceptoDeIngreso } from '../../servicios/conceptos-de-ingreso.api';

/** El concepto de ingreso en la lista; los de sistema solo se ven. */
defineProps<{ registro: ConceptoDeIngreso }>();
defineEmits<{ editar: []; eliminar: []; 'cambiar-estado': [] }>();
const PERMISO = 'libro-de-ventas.conceptos-de-ingreso.editar';
</script>

<template>
  <TarjetaDeRegistro
    :titulo="registro.nombre"
    :detalles="detallesDeConceptoDeIngreso(registro)"
    :permiso="PERMISO"
    permiso-eliminar="libro-de-ventas.conceptos-de-ingreso.eliminar"
    :inactivo="!registro.activo"
    :insignia="esDeSistema(registro) ? 'De sistema' : undefined"
    :eliminable="!esDeSistema(registro)"
    :sin-editar="esDeSistema(registro)"
    @editar="$emit('editar')"
    @eliminar="$emit('eliminar')"
  >
    <template v-if="esDeSistema(registro)" #destacado>
      <p class="text-xs text-tierra-500">{{ EXPLICACION_DE_SISTEMA }}</p>
    </template>
    <template v-if="!esDeSistema(registro)" #acciones-extra>
      <BotonBase v-permiso="PERMISO" variante="fantasma" pequeno @click="$emit('cambiar-estado')">
        {{ registro.activo ? 'Inactivar' : 'Reactivar' }}
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
