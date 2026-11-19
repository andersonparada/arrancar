<script setup lang="ts">
import { CircleCheck } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type { EdicionDeLaVentanaDeAnticipo } from '../composables/anticipos/usar-ventana-de-anticipo';
import type { Anticipo, AnticipoResumen } from '../servicios/anticipos.api';
import type { MediosParaElegir } from '../servicios/opciones.api';
import AvisosDeLaPantalla from './AvisosDeLaPantalla.vue';
import CamposDeAnticipo from './CamposDeAnticipo.vue';

/**
 * Entregar un anticipo. Antes de confirmar avisa si el beneficiario ya tiene anticipos vencidos; al registrarlo muestra
 * el resultado con los avisos (de Bancos, de vencidos y de facturas a nombre de la empresa) y lleva a la ficha.
 */
defineProps<{
  resultado: Anticipo | null;
  vencidos: AnticipoResumen[];
  medios: MediosParaElegir | null;
  beneficiarios: OpcionBuscable<string>[];
  usuarios: OpcionBuscable<string>[];
  puedeElegirUsuario: boolean;
  puedeVerTerceros: boolean;
  puedeCrearTerceros: boolean;
  fechaLimitePropuesta: string;
  cargando: boolean;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: []; nuevoBeneficiario: [] }>();
const edicion = defineModel<EdicionDeLaVentanaDeAnticipo>({ required: true });
const clase =
  'inline-flex items-center justify-center rounded-lg bg-campo-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-campo-800 dark:bg-campo-600 dark:hover:bg-campo-500';
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="resultado ? 'Anticipo entregado' : 'Entregar un anticipo'"
    ancha
    @cerrar="emit('cerrar')"
  >
    <div v-if="resultado" class="space-y-4">
      <div class="flex items-start gap-3" role="status">
        <CircleCheck class="mt-0.5 size-6 shrink-0 text-campo-700 dark:text-campo-300" aria-hidden="true" />
        <p class="font-medium">
          Anticipo {{ resultado.numero }} entregado a {{ resultado.beneficiario }}. Ahora puede agregarle las facturas
          que vaya entregando.
        </p>
      </div>
      <AvisosDeLaPantalla :avisos="resultado.avisos" titulo="Revise estos avisos" />
    </div>
    <form v-else id="form-anticipo" novalidate class="space-y-4" @submit.prevent="emit('guardar')">
      <AvisosDeLaPantalla
        :avisos="vencidos.flatMap(({ aviso }) => (aviso ? [aviso] : []))"
        titulo="Este beneficiario tiene anticipos vencidos"
      />
      <CamposDeAnticipo
        v-model="edicion"
        :medios="medios"
        :beneficiarios="beneficiarios"
        :usuarios="usuarios"
        :puede-elegir-usuario="puedeElegirUsuario"
        :puede-ver-terceros="puedeVerTerceros"
        :puede-crear-terceros="puedeCrearTerceros"
        :cargando="cargando"
        :hay-vencidos="vencidos.length > 0"
        :fecha-limite-propuesta="fechaLimitePropuesta"
        :errores="errores"
        @nuevo-beneficiario="emit('nuevoBeneficiario')"
      />
    </form>
    <template #pie>
      <template v-if="resultado">
        <BotonBase variante="secundario" @click="emit('cerrar')">Cerrar</BotonBase>
        <RouterLink :to="{ name: 'cuentas-por-liquidar.anticipos.ficha', params: { id: resultado.id } }" :class="clase">
          Ver el anticipo
        </RouterLink>
      </template>
      <template v-else>
        <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
        <BotonBase tipo="submit" form="form-anticipo" :cargando="enviando">Entregar el anticipo</BotonBase>
      </template>
    </template>
  </VentanaModal>
</template>
