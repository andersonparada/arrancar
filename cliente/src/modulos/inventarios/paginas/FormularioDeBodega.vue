<script setup lang="ts">
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import CamposDeBodega from '../componentes/bodegas/CamposDeBodega.vue';
import { usarFormularioDeBodega } from '../composables/bodegas/usar-formulario-de-bodega';
import { VENTANAS_INVENTARIOS } from '../textos';

/** Alta y edición en página completa; sin `bodegaId` es una bodega nueva. */
const props = defineProps<{ bodegaId?: string }>();

const router = useRouter();
const ventana = VENTANAS_INVENTARIOS.bodegas;
const { edicion, cargando, enviando, errores, referencias, conflicto, guardar } = usarFormularioDeBodega(
  props.bodegaId ?? null,
);
const volver = props.bodegaId
  ? { texto: 'Volver a la ficha', ruta: { name: 'inventarios.bodegas.ficha', params: { bodegaId: props.bodegaId } } }
  : { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'inventarios.bodegas' } };

async function guardarYVerFicha(): Promise<void> {
  const guardado = await guardar();
  if (guardado) await router.push({ name: 'inventarios.bodegas.ficha', params: { bodegaId: guardado.id } });
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="guardarYVerFicha">
    <EncabezadoPagina :titulo="bodegaId ? ventana.editar : ventana.nuevo" :volver="volver" />

    <p
      v-if="conflicto"
      role="alert"
      class="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
    >
      {{ conflicto }}
    </p>
    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <TarjetaBase v-else>
      <CamposDeBodega
        v-model="edicion"
        :errores="errores"
        :opciones="referencias.opciones.value"
        :puede-elegir-localidad="referencias.puedeElegirLocalidad"
        :puede-elegir-responsable="referencias.puedeElegirResponsable"
      />
    </TarjetaBase>

    <div class="flex justify-end gap-2">
      <BotonBase variante="secundario" @click="router.push(volver.ruta)">Cancelar</BotonBase>
      <BotonBase tipo="submit" :cargando="enviando">Guardar</BotonBase>
    </div>
  </form>
</template>
