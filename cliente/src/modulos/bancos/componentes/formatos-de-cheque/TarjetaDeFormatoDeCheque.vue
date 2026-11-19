<script setup lang="ts">
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { detallesDeFormatoDeCheque } from '../../composables/formatos-de-cheque/detalles-de-formato-de-cheque';
import type { FormatoDeChequeGuardado, PlantillaDeCheque } from '../../servicios/tipos-de-formatos-de-cheque';

/**
 * Un formato de la cuenta: su plantilla, cuántas chequeras lo usan y si ya pasó la prueba de alineación. Se elimina solo
 * si ninguna chequera lo usa; si no, se inactiva.
 */
const props = defineProps<{ registro: FormatoDeChequeGuardado; plantillas: PlantillaDeCheque[] }>();
const emit = defineEmits<{ editar: []; eliminar: []; 'cambiar-estado': [] }>();
const destinoDeLaPrueba = () => ({ name: 'bancos.formatos-de-cheque.prueba', query: { formato: props.registro.id } });
</script>

<template>
  <TarjetaDeRegistro
    :titulo="registro.nombre"
    :detalles="detallesDeFormatoDeCheque(registro, plantillas)"
    permiso="bancos.formatos-de-cheque.editar"
    permiso-eliminar="bancos.formatos-de-cheque.eliminar"
    :inactivo="!registro.activo"
    :insignia="registro.probadoEn ? undefined : 'Sin probar'"
    :eliminable="registro.chequerasQueLoUsan === 0"
    @editar="emit('editar')"
    @eliminar="emit('eliminar')"
  >
    <template #acciones-extra>
      <RouterLink
        v-permiso="'bancos.formatos-de-cheque.ver'"
        :to="destinoDeLaPrueba()"
        class="inline-flex items-center rounded-lg px-2 py-1 text-sm font-medium text-campo-700 hover:underline dark:text-campo-400"
      >
        Prueba de alineación
      </RouterLink>
      <BotonBase
        v-permiso="'bancos.formatos-de-cheque.editar'"
        variante="fantasma"
        pequeno
        @click="emit('cambiar-estado')"
      >
        {{ registro.activo ? 'Inactivar' : 'Reactivar' }}
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
