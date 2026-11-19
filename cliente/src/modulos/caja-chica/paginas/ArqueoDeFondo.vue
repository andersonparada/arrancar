<script setup lang="ts">
import { Landmark } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import CamposDelArqueo from '../componentes/CamposDelArqueo.vue';
import ConteoDeEfectivo from '../componentes/ConteoDeEfectivo.vue';
import ResultadoDelArqueo from '../componentes/ResultadoDelArqueo.vue';
import ResumenDelFondo from '../componentes/ResumenDelFondo.vue';
import { usarArqueo } from '../composables/arqueos/usar-arqueo';
import { VENTANAS_CAJA_CHICA } from '../textos';

const props = defineProps<{ id: string }>();
const arqueo = usarArqueo(props.id);
const { edicion, errores, resultado } = arqueo;
const volver = { texto: 'Volver al fondo', ruta: { name: 'caja-chica.fondos.ficha', params: { id: props.id } } };
</script>

<template>
  <div>
    <EncabezadoPagina
      :titulo="`Arqueo de ${arqueo.propuesta.value?.fondoNombre ?? 'el fondo'}`"
      :descripcion="VENTANAS_CAJA_CHICA.arqueo.descripcion"
      :volver="volver"
    />
    <p v-if="arqueo.cargando.value && !arqueo.propuesta.value" class="text-sm text-tierra-500" role="status">
      Cargando…
    </p>
    <EstadoVacio
      v-else-if="!arqueo.propuesta.value"
      :icono="Landmark"
      titulo="No se pudo preparar el arqueo"
      descripcion="El fondo no existe, no lo tiene asignado o no está abierto."
    />
    <form v-else class="space-y-6" novalidate @submit.prevent="arqueo.registrar">
      <ResumenDelFondo :partes="arqueo.partes.value" :avisos="arqueo.propuesta.value.avisos" />
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ConteoDeEfectivo
          v-model="edicion.cantidades"
          :denominaciones="arqueo.propuesta.value.denominaciones"
          :error="errores.conteo"
        />
        <div class="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <ResultadoDelArqueo :resultado="resultado" :esperado="arqueo.propuesta.value.efectivoEsperado" />
          <CamposDelArqueo v-model="edicion" :tipo="resultado.tipo" :errores="errores" />
          <BotonBase tipo="submit" class="w-full" :cargando="arqueo.enviando.value">Registrar arqueo</BotonBase>
        </div>
      </div>
    </form>
  </div>
</template>
