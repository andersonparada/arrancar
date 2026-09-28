<script setup lang="ts">
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import CamposDeCuentaBancaria from '../componentes/cuentas-bancarias/CamposDeCuentaBancaria.vue';
import { usarFormularioDeCuentaBancaria } from '../composables/cuentas-bancarias/usar-formulario-de-cuenta-bancaria';
import { VENTANAS_BANCOS } from '../textos';

/** Alta y edición en página completa; sin `cuentaBancariaId` es una cuenta bancaria nueva. */
const props = defineProps<{ cuentaBancariaId?: string }>();

const router = useRouter();
const ventana = VENTANAS_BANCOS.cuentasBancarias;
const { edicion, cargando, enviando, errores, referencias, guardar } = usarFormularioDeCuentaBancaria(
  props.cuentaBancariaId ?? null,
);
const volver = props.cuentaBancariaId
  ? {
      texto: 'Volver a la ficha',
      ruta: { name: 'bancos.cuentas-bancarias.ficha', params: { cuentaBancariaId: props.cuentaBancariaId } },
    }
  : { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'bancos.cuentas-bancarias' } };

async function guardarYVerFicha(): Promise<void> {
  const guardado = await guardar();
  if (guardado)
    await router.push({ name: 'bancos.cuentas-bancarias.ficha', params: { cuentaBancariaId: guardado.id } });
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="guardarYVerFicha">
    <EncabezadoPagina :titulo="cuentaBancariaId ? ventana.editar : ventana.nuevo" :volver="volver" />

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <TarjetaBase v-else>
      <CamposDeCuentaBancaria v-model="edicion" :errores="errores" :referencias="referencias" />
    </TarjetaBase>

    <div class="flex justify-end gap-2">
      <BotonBase variante="secundario" @click="router.push(volver.ruta)">Cancelar</BotonBase>
      <BotonBase tipo="submit" :cargando="enviando">Guardar</BotonBase>
    </div>
  </form>
</template>
