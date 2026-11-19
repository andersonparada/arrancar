<script setup lang="ts">
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import FormularioDeAjustesDelAviso from '../componentes/FormularioDeAjustesDelAviso.vue';
import { usarAjustesDelAviso } from '../composables/avisos/usar-ajustes-del-aviso';
import { VENTANA_DE_AVISOS_DE_PAGO } from '../avisos-del-modulo';

/** Los avisos de pago por correo de la empresa: cuándo salen y cómo se escriben. */
const ventana = VENTANA_DE_AVISOS_DE_PAGO;
const ajustes = usarAjustesDelAviso();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" />
    <p v-if="ajustes.cargando.value" class="text-sm text-tierra-500">Cargando…</p>
    <FormularioDeAjustesDelAviso
      v-else
      v-model="ajustes.borrador.value"
      class="max-w-3xl"
      :ayuda="ajustes.guardado.value"
      :errores="ajustes.errores.value"
      :enviando="ajustes.enviando.value"
      :hay-cambios="ajustes.hayCambios.value"
      @guardar="ajustes.guardar"
    />
  </div>
</template>
