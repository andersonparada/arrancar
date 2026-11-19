<script setup lang="ts">
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import CamposDeActivo from '../componentes/activos/CamposDeActivo.vue';
import { usarFormularioDeActivo } from '../composables/activos/usar-formulario-de-activo';
import { VENTANAS_ACTIVOS_FIJOS } from '../textos';

/** Alta manual de un activo en página completa (los costos llegan con los pasos siguientes). */
const router = useRouter();
const ventana = VENTANAS_ACTIVOS_FIJOS.activos;
const { edicion, enviando, errores, referencias, guardar } = usarFormularioDeActivo();
const volver = { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'activos-fijos.activos' } };

async function guardarYVerFicha(): Promise<void> {
  const guardado = await guardar();
  if (guardado) await router.push({ name: 'activos-fijos.activos.ficha', params: { activoId: guardado.id } });
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="guardarYVerFicha">
    <EncabezadoPagina :titulo="ventana.nuevo" :volver="volver" />

    <TarjetaBase>
      <CamposDeActivo
        v-model="edicion"
        :errores="errores"
        :referencias="referencias.opciones.value"
        :inciso="referencias.inciso.value"
      />
    </TarjetaBase>

    <div class="flex justify-end gap-2">
      <BotonBase variante="secundario" @click="router.push(volver.ruta)">Cancelar</BotonBase>
      <BotonBase tipo="submit" :cargando="enviando">Guardar</BotonBase>
    </div>
  </form>
</template>
