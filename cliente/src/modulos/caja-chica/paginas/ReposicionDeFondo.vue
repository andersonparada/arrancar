<script setup lang="ts">
import { Printer, ReceiptText } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import CamposDeEntrega from '../componentes/CamposDeEntrega.vue';
import EnlaceComoBoton from '../componentes/EnlaceComoBoton.vue';
import ListaParaReponer from '../componentes/ListaParaReponer.vue';
import ResumenDeLaReposicion from '../componentes/ResumenDeLaReposicion.vue';
import { usarReposicion } from '../composables/reposiciones/usar-reposicion';
import { VENTANAS_CAJA_CHICA } from '../textos';

const props = defineProps<{ id: string }>();
const reposicion = usarReposicion(props.id);
const { catalogos, edicion, errores, resumen } = reposicion;
const volver = { texto: 'Volver al fondo', ruta: { name: 'caja-chica.fondos.ficha', params: { id: props.id } } };
</script>

<template>
  <div>
    <EncabezadoPagina
      :titulo="`Reponer ${reposicion.solicitud.value?.fondoNombre ?? 'el fondo'}`"
      :descripcion="VENTANAS_CAJA_CHICA.reposicion.descripcion"
      :volver="volver"
    >
      <EnlaceComoBoton :icono="Printer" :to="{ name: 'caja-chica.fondos.solicitud', params: { id } }">
        Imprimir la solicitud
      </EnlaceComoBoton>
    </EncabezadoPagina>

    <p v-if="reposicion.cargando.value && !reposicion.solicitud.value" class="text-sm text-tierra-500" role="status">
      Cargando…
    </p>
    <EstadoVacio
      v-else-if="reposicion.pendientes.value.length === 0"
      :icono="ReceiptText"
      titulo="No hay nada pendiente de reponer"
      descripcion="Registre facturas, vales de gasto o un arqueo con faltante en la ficha del fondo; luego vuelva aquí."
    />
    <form
      v-else
      class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
      novalidate
      @submit.prevent="reposicion.reponer"
    >
      <ListaParaReponer
        :pendientes="reposicion.pendientes.value"
        :elegidos="reposicion.elegidos.value"
        :error="errores.comprobanteIds"
        @alternar="reposicion.alternar"
        @alternar-todos="reposicion.alternarTodos"
      />
      <div class="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <ResumenDeLaReposicion :resumen="resumen" :desglose="reposicion.solicitud.value?.desglose ?? null" />
        <CamposDeEntrega
          v-model="edicion"
          sin-monto
          :chequeras="catalogos.chequeras.value"
          :cuentas="catalogos.cuentas.value"
          :cargando="catalogos.cargando.value"
          :errores="errores"
          :beneficiario-propuesto="reposicion.solicitud.value?.custodio ?? ''"
        />
        <BotonBase tipo="submit" class="w-full" :cargando="reposicion.enviando.value">
          Reponer {{ formatearMonto(resumen.total) }}
        </BotonBase>
      </div>
    </form>
  </div>
</template>
