<script setup lang="ts">
import { Banknote, CalendarClock, FilePlus, Printer, Ban } from 'lucide-vue-next';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { puedeRegistrarPago } from '../composables/contrasenas/pagos-de-la-contrasena';
import type { FichaDeContrasena } from '../servicios/tipos-de-contrasenas';

/**
 * Los botones de la ficha: imprimir siempre; editar y anular solo si el servidor dice que se puede y hay permiso;
 * registrar el pago si hay algo autorizado por pagar y el usuario puede pagar de alguna forma.
 */
defineProps<{ ficha: FichaDeContrasena }>();
defineEmits<{ imprimir: []; pagar: []; cambiarFecha: []; agregar: []; anular: [] }>();
const sesion = usarSesion();
</script>

<template>
  <BotonBase variante="secundario" :icono="Printer" @click="$emit('imprimir')">Imprimir</BotonBase>
  <BotonBase v-if="puedeRegistrarPago(ficha, sesion.puede)" :icono="Banknote" @click="$emit('pagar')">
    Registrar pago
  </BotonBase>
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
