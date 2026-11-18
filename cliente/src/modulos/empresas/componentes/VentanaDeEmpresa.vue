<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import SeccionesAportadas from '@/modulos/core/componentes/SeccionesAportadas.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { puedeCerrarLaCarga } from '../composables/datos-de-empresa';
import type { EdicionDeEmpresa } from '../composables/edicion-de-empresa';
import type { CargaInicialEnEdicion } from '../composables/usar-carga-inicial';
import SeccionDeCargaInicial from './SeccionDeCargaInicial.vue';
import SeccionDeDatosFiscales from './SeccionDeDatosFiscales.vue';
import VentanasDeCargaInicial from './VentanasDeCargaInicial.vue';

const props = defineProps<{
  errores: Record<string, string>;
  enviando: boolean;
  cargaInicial: CargaInicialEnEdicion;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeEmpresa>({ required: true });
const puedeCerrar = computed(() => puedeCerrarLaCarga(edicion.value, props.cargaInicial.carga));

/** Con otra ventana encima (cierre, reapertura, historial…), Escape solo debe cerrar esa. */
const cerrarVentana = () => (props.cargaInicial.hayVentanaEncima ? undefined : emit('cerrar'));
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.empresaId ? 'Editar empresa' : 'Nueva empresa'"
    @cerrar="cerrarVentana"
  >
    <form id="form-empresa" class="space-y-4" @submit.prevent="emit('guardar')">
      <CampoTexto
        v-model="edicion.nombre"
        etiqueta="Nombre"
        placeholder="Ej. Comercial San José"
        requerido
        :error="errores.nombre"
      />
      <CampoTexto v-model="edicion.nit" etiqueta="NIT" placeholder="Ej. 1234567-8" :error="errores.nit" />
      <CampoTexto v-model="edicion.direccion" etiqueta="Dirección" :error="errores.direccion" />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto v-model="edicion.telefono" etiqueta="Teléfono" tipo="tel" :error="errores.telefono" />
        <CampoTexto v-model="edicion.correo" etiqueta="Correo" tipo="email" :error="errores.correo" />
      </div>
      <SeccionesAportadas
        v-model="edicion.secciones"
        en="empresa"
        :registro-id="edicion.empresaId"
        :errores="errores"
      />
      <template v-if="edicion.empresaId">
        <SeccionDeDatosFiscales
          v-model:razon-social="edicion.razonSocial"
          v-model:nombre-comercial="edicion.nombreComercial"
          :errores="errores"
        />
        <SeccionDeCargaInicial
          v-model:fecha-de-inicio="edicion.fechaDeInicio"
          :estado="cargaInicial"
          :errores="errores"
          :puede-cerrar="puedeCerrar"
        />
        <CampoInterruptor
          v-model="edicion.activa"
          etiqueta="Empresa activa"
          descripcion="Una empresa desactivada no aparece en el selector."
        />
      </template>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-empresa" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
  <VentanasDeCargaInicial :estado="cargaInicial" />
</template>
