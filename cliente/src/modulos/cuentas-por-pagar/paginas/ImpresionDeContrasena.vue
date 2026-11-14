<script setup lang="ts">
import { Printer } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import HojaDeContrasena from '../componentes/HojaDeContrasena.vue';
import { usarImpresionDeContrasena } from '../composables/contrasenas/usar-impresion-de-contrasena';

/** La contraseña lista para imprimir: original para el proveedor y copia para la empresa, una hoja cada una. */
const props = defineProps<{ id: string }>();
const { impresion, cargando, imprimiendo, imprimir } = usarImpresionDeContrasena(() => props.id);
const volver = {
  texto: 'Volver a la contraseña',
  ruta: { name: 'cuentas-por-pagar.contrasenas.ficha', params: { id: props.id } },
};
</script>

<template>
  <div v-if="impresion" class="space-y-4">
    <div class="print:hidden">
      <EncabezadoPagina
        :titulo="`Imprimir la contraseña ${impresion.contrasena.numero}`"
        descripcion="Se imprimen dos hojas: el original para el proveedor y la copia para la empresa, que el proveedor firma."
        :volver="volver"
      >
        <BotonBase :icono="Printer" :cargando="imprimiendo" @click="imprimir">Imprimir</BotonBase>
      </EncabezadoPagina>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Esto es la vista previa: no cuenta como impresión hasta que presione «Imprimir». Si ya se había impreso, las
        hojas saldrán con «REIMPRESIÓN».
      </p>
    </div>

    <div class="space-y-6 print:space-y-0">
      <HojaDeContrasena
        v-for="hoja in impresion.hojas"
        :key="hoja.rotulo"
        :impresion="impresion"
        :hoja="hoja"
        class="print:break-after-page print:last:break-after-auto"
      />
    </div>
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500 print:hidden" role="status">Preparando la contraseña…</p>
</template>
