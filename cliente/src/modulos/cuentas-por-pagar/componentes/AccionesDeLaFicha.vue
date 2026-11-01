<script setup lang="ts">
import { BadgeCheck, Ban, CalendarClock, Trash2, Undo2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { sePuedeMarcarParaAutorizar } from '../composables/reglas-de-acciones';
import type { FichaDelDocumento } from '../servicios/tipos';

/**
 * Los botones de la ficha. Cada uno aparece si el servidor dice que la acción se puede hacer con el documento
 * (`puede…`) y el usuario tiene su permiso; el servidor vuelve a revisar al ejecutarla.
 */
defineProps<{ ficha: FichaDelDocumento; puedeAutorizarPropios: boolean; autorizando: boolean }>();
defineEmits<{
  autorizar: [];
  desautorizar: [];
  cambiarVencimiento: [];
  anular: [];
  eliminar: [];
}>();
</script>

<template>
  <BotonBase
    v-if="sePuedeMarcarParaAutorizar(ficha, puedeAutorizarPropios)"
    v-permiso="'cuentas-por-pagar.documentos.autorizar'"
    :icono="BadgeCheck"
    :cargando="autorizando"
    @click="$emit('autorizar')"
  >
    Autorizar
  </BotonBase>
  <BotonBase
    v-if="ficha.puedeCambiarVencimiento"
    v-permiso="'cuentas-por-pagar.documentos.registrar'"
    variante="secundario"
    :icono="CalendarClock"
    @click="$emit('cambiarVencimiento')"
  >
    Cambiar vencimiento
  </BotonBase>
  <BotonBase
    v-if="ficha.puedeDesautorizar"
    v-permiso="'cuentas-por-pagar.documentos.autorizar'"
    variante="secundario"
    :icono="Undo2"
    @click="$emit('desautorizar')"
  >
    Desautorizar
  </BotonBase>
  <BotonBase
    v-if="ficha.puedeAnular"
    v-permiso="'cuentas-por-pagar.documentos.anular'"
    variante="secundario"
    :icono="Ban"
    @click="$emit('anular')"
  >
    Anular el registro
  </BotonBase>
  <BotonBase
    v-if="ficha.puedeEliminar"
    v-permiso="'cuentas-por-pagar.documentos.eliminar'"
    variante="secundario"
    :icono="Trash2"
    @click="$emit('eliminar')"
  >
    Eliminar
  </BotonBase>
</template>
