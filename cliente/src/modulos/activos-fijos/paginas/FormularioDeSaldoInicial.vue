<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import CamposDeMontosDeSaldo from '../componentes/saldos-iniciales/CamposDeMontosDeSaldo.vue';
import CamposDelBienDeSaldo from '../componentes/saldos-iniciales/CamposDelBienDeSaldo.vue';
import { sinDepreciacion } from '../composables/saldos-iniciales/edicion-de-saldo-inicial';
import { usarFormularioDeSaldo } from '../composables/saldos-iniciales/usar-formulario-de-saldo';
import { VENTANAS_ACTIVOS_FIJOS } from '../textos';

/** Cargar o corregir (con `activoId`) el saldo inicial de un activo, en página completa. */
const props = defineProps<{ activoId?: string }>();
const router = useRouter();
const ventana = VENTANAS_ACTIVOS_FIJOS.saldosIniciales;
const { edicion, enviando, errores, cargando, referencias, guardar } = usarFormularioDeSaldo(props.activoId);
const volver = { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'activos-fijos.saldos-iniciales' } };
const sinAcumular = computed(() => sinDepreciacion(edicion.value, referencias.inciso.value));

async function guardarYVolver(): Promise<void> {
  if (await guardar()) await router.push(volver.ruta);
}
</script>

<template>
  <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
  <form v-else class="space-y-4" @submit.prevent="guardarYVolver">
    <EncabezadoPagina :titulo="props.activoId ? ventana.editar : ventana.nuevo" :volver="volver" />

    <TarjetaBase>
      <CamposDelBienDeSaldo
        v-model="edicion"
        :errores="errores"
        :referencias="referencias.opciones.value"
        :inciso="referencias.inciso.value"
      />
    </TarjetaBase>
    <TarjetaBase>
      <CamposDeMontosDeSaldo v-model="edicion" :errores="errores" :sin-depreciacion="sinAcumular" />
    </TarjetaBase>

    <div class="flex justify-end gap-2">
      <BotonBase variante="secundario" @click="router.push(volver.ruta)">Cancelar</BotonBase>
      <BotonBase tipo="submit" :cargando="enviando">Guardar</BotonBase>
    </div>
  </form>
</template>
