<script setup lang="ts">
import { CalendarClock, FilePlus, Printer, Ban } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import type { FichaDeContrasena } from '../servicios/tipos-de-contrasenas';

/** Los botones de la ficha: imprimir siempre; editar y anular solo si el servidor dice que se puede y hay permiso. */
defineProps<{ ficha: FichaDeContrasena }>();
defineEmits<{ imprimir: []; cambiarFecha: []; agregar: []; anular: [] }>();
</script>

<template>
  <BotonBase variante="secundario" :icono="Printer" @click="$emit('imprimir')">Imprimir</BotonBase>
  <template v-if="ficha.puedeEditar">
    <span v-permiso="'cuentas-por-pagar.contrasenas.editar'" class="contents">
      <BotonBase variante="secundario" :icono="CalendarClock" @click="$emit('cambiarFecha')">
        Cambiar fecha de pago
      </BotonBase>
    </span>
    <span v-permiso="'cuentas-por-pagar.contrasenas.editar'" class="contents">
      <BotonBase variante="secundario" :icono="FilePlus" @click="$emit('agregar')">Agregar documentos</BotonBase>
    </span>
  </template>
  <span v-if="ficha.puedeAnular" v-permiso="'cuentas-por-pagar.contrasenas.anular'" class="contents">
    <BotonBase variante="peligro" :icono="Ban" @click="$emit('anular')">Anular</BotonBase>
  </span>
</template>
