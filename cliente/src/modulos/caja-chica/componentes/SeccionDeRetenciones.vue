<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { tituloDeComprobante } from '../composables/comprobantes/detalles-de-comprobante';
import type { ComprobanteDeLaBandeja } from '../servicios/tipos-de-comprobantes';

/**
 * Las facturas con retención que esperan en la bandeja: una factura con retención no entra sola a un fondo. Quien tiene el
 * permiso de excepción la asigna aquí con un motivo; el resto ve que existe y por qué no puede.
 */
defineProps<{ documentos: ComprobanteDeLaBandeja[] }>();
const emit = defineEmits<{ asignar: [documento: ComprobanteDeLaBandeja] }>();
const puedeAsignar = usarSesion().puede('caja-chica.comprobantes.con-retencion');
</script>

<template>
  <section v-if="documentos.length > 0" aria-labelledby="titulo-de-retenciones" class="space-y-2">
    <h2 id="titulo-de-retenciones" class="text-lg font-semibold">Facturas con retención en la bandeja</h2>
    <p class="text-sm text-tierra-600 dark:text-tierra-300">
      La retención la entera la empresa, no el fondo. Para pagar una de estas facturas del fondo hace falta el permiso
      de excepción y un motivo<template v-if="!puedeAsignar"
        >; usted no lo tiene, pida a un administrador que la asigne</template
      >.
    </p>
    <ul class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <li v-for="documento in documentos" :key="documento.id">
        <TarjetaBase class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate font-semibold">{{ tituloDeComprobante(documento) }}</p>
            <p class="truncate text-sm text-tierra-600 dark:text-tierra-300">
              {{ documento.documento?.proveedorNombre }} · sale del fondo {{ formatearMonto(documento.monto) }} ·
              retención
              {{ formatearMonto(documento.montoRetenido) }}
            </p>
          </div>
          <BotonBase
            v-if="documento.puedeAsignarConRetencion"
            v-permiso="'caja-chica.comprobantes.crear'"
            variante="secundario"
            pequeno
            :icono="ShieldCheck"
            @click="emit('asignar', documento)"
          >
            Asignar con retención
          </BotonBase>
        </TarjetaBase>
      </li>
    </ul>
  </section>
</template>
