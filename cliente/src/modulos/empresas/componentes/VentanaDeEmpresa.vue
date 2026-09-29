<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { puedeCerrarLaCarga } from '../composables/datos-de-empresa';
import type { EdicionDeEmpresa } from '../composables/edicion-de-empresa';
import type { CargaInicial } from '../servicios/datos-de-empresa.api';
import SeccionDeCargaInicial from './SeccionDeCargaInicial.vue';
import SeccionDeDatosFiscales from './SeccionDeDatosFiscales.vue';
import VentanaDeReapertura from './VentanaDeReapertura.vue';

const props = defineProps<{
  errores: Record<string, string>;
  enviando: boolean;
  carga: CargaInicial | null;
  enviandoCierre: boolean;
  erroresDeReapertura: Record<string, string>;
  enviandoReapertura: boolean;
  reaperturaAbierta: boolean;
}>();
const emit = defineEmits<{
  cerrar: [];
  guardar: [];
  cerrarCarga: [];
  abrirReapertura: [];
  cancelarReapertura: [];
  reabrir: [];
}>();
const edicion = defineModel<EdicionDeEmpresa>({ required: true });
const motivo = defineModel<string>('motivo', { required: true });
const puedeCerrar = computed(() => puedeCerrarLaCarga(edicion.value, props.carga));

/** Con la ventana del motivo encima, Escape solo debe cerrar esa. */
const cerrarVentana = () => (props.reaperturaAbierta ? undefined : emit('cerrar'));
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
        placeholder="Ej. Rancho San José"
        requerido
        :error="errores.nombre"
      />
      <CampoTexto v-model="edicion.nit" etiqueta="NIT" placeholder="Ej. 1234567-8" :error="errores.nit" />
      <CampoTexto v-model="edicion.direccion" etiqueta="Dirección" :error="errores.direccion" />
      <div class="grid gap-4 sm:grid-cols-2">
        <CampoTexto v-model="edicion.telefono" etiqueta="Teléfono" tipo="tel" :error="errores.telefono" />
        <CampoTexto v-model="edicion.correo" etiqueta="Correo" tipo="email" :error="errores.correo" />
      </div>
      <template v-if="edicion.empresaId">
        <SeccionDeDatosFiscales
          v-model:razon-social="edicion.razonSocial"
          v-model:nombre-comercial="edicion.nombreComercial"
          :errores="errores"
        />
        <SeccionDeCargaInicial
          v-model:fecha-de-inicio="edicion.fechaDeInicio"
          :carga="carga"
          :errores="errores"
          :enviando="enviandoCierre"
          :puede-cerrar="puedeCerrar"
          @cerrar="emit('cerrarCarga')"
          @reabrir="emit('abrirReapertura')"
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
  <VentanaDeReapertura
    v-model:motivo="motivo"
    :abierta="reaperturaAbierta"
    :errores="erroresDeReapertura"
    :enviando="enviandoReapertura"
    @cerrar="emit('cancelarReapertura')"
    @confirmar="emit('reabrir')"
  />
</template>
