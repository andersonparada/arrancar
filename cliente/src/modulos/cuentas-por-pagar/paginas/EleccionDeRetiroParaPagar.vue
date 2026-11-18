<script setup lang="ts">
import { Wallet } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { usarEleccionDeRetiro } from '../composables/retiros/usar-eleccion-de-retiro';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

/**
 * Pagar en efectivo sin retiro elegido (por ejemplo, desde una contraseña): se escoge el retiro con efectivo disponible.
 * Con uno solo se pasa directo; el proveedor y la contraseña del enlace se conservan.
 */
const ventana = VENTANAS_CUENTAS_POR_PAGAR.retiros;
const eleccion = usarEleccionDeRetiro();
const volver = { texto: ventana.titulo, ruta: { name: 'cuentas-por-pagar.retiros' } };
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.elegir" :descripcion="ventana.descripcionDelPago" :volver="volver" />
    <p v-if="eleccion.cargando.value" class="text-sm text-tierra-500" role="status">Buscando retiros con efectivo…</p>
    <EstadoVacio
      v-else-if="eleccion.retiros.value.length === 0"
      :icono="Wallet"
      titulo="No hay retiros con efectivo para repartir"
      descripcion="Para pagar en efectivo primero se retira el dinero del banco. Registre un retiro y vuelva aquí."
    >
      <span v-permiso="'cuentas-por-pagar.retiros.crear'" class="contents">
        <BotonBase @click="$router.push({ name: 'cuentas-por-pagar.retiros' })">Ir a Retiros de efectivo</BotonBase>
      </span>
    </EstadoVacio>
    <TarjetaBase v-else>
      <CampoSelector
        model-value=""
        etiqueta="Retiro del que sale el efectivo"
        requerido
        :opciones="eleccion.opciones.value"
        @update:model-value="eleccion.elegir(String($event ?? ''))"
      />
    </TarjetaBase>
  </div>
</template>
