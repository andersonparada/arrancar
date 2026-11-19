<script setup lang="ts">
import { computed } from 'vue';
import { Inbox, ReceiptText } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import CamposDeExcepciones from '../componentes/CamposDeExcepciones.vue';
import ListaDeGastosSinFactura from '../componentes/ListaDeGastosSinFactura.vue';
import ResumenDeLaLiquidacion from '../componentes/ResumenDeLaLiquidacion.vue';
import TarjetaDeDocumentoDeBandeja from '../componentes/TarjetaDeDocumentoDeBandeja.vue';
import VentanaDeValeDeGasto from '../componentes/VentanaDeValeDeGasto.vue';
import { usarLiquidacionDeVale } from '../composables/vales/usar-liquidacion-de-vale';
import { VENTANAS_CAJA_CHICA } from '../textos';

const props = defineProps<{ id: string }>();
const liquidacion = usarLiquidacionDeVale(props.id);
const { asignacion, errores, resumenDeDocumentos, ventanaDeGasto: ventana } = liquidacion;
const volver = computed(() => ({
  texto: 'Volver al fondo',
  ruta: { name: 'caja-chica.fondos.ficha', params: { id: liquidacion.vale.value?.fondoId ?? '' } },
}));
</script>

<template>
  <div>
    <EncabezadoPagina
      :titulo="`Liquidar el vale ${liquidacion.vale.value?.numero ?? ''}`"
      :descripcion="VENTANAS_CAJA_CHICA.liquidacion.descripcion"
      :volver="volver"
    />
    <p v-if="liquidacion.cargando.value && !liquidacion.vale.value" class="text-sm text-tierra-500" role="status">
      Cargando…
    </p>
    <EstadoVacio
      v-else-if="liquidacion.vale.value?.estado !== 'abierto'"
      :icono="ReceiptText"
      titulo="Este vale ya no se puede liquidar"
      descripcion="No existe, ya se liquidó o se anuló. Vuelva a la ficha del fondo para ver su estado."
    />
    <form
      v-else
      class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
      novalidate
      @submit.prevent="liquidacion.liquidar"
    >
      <div class="space-y-6">
        <p class="text-sm">
          Entregado a <strong>{{ liquidacion.vale.value.entregadoA }}</strong
          >: {{ liquidacion.vale.value.motivo }}
        </p>
        <section aria-labelledby="titulo-de-documentos" class="space-y-3">
          <h2 id="titulo-de-documentos" class="text-lg font-semibold">Facturas de la bandeja</h2>
          <EstadoVacio
            v-if="liquidacion.bandeja.value.length === 0"
            :icono="Inbox"
            titulo="No hay facturas en la bandeja"
            descripcion="Las facturas se registran en el libro de compras con destino a Caja chica. Puede liquidar con gastos sin factura, o sin comprobantes si regresó todo el dinero."
          />
          <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <li v-for="documento in liquidacion.bandeja.value" :key="documento.id">
              <TarjetaDeDocumentoDeBandeja
                :documento="documento"
                :marcado="liquidacion.marcados.value.includes(documento.id)"
                @alternar="liquidacion.alternar(documento)"
              />
            </li>
          </ul>
        </section>
        <ListaDeGastosSinFactura
          :gastos="liquidacion.gastos.value"
          :conceptos="liquidacion.conceptos.value"
          @agregar="ventana.abrir"
          @quitar="liquidacion.quitarGasto"
        />
      </div>
      <div class="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <ResumenDeLaLiquidacion :monto="liquidacion.vale.value.monto" :cuadro="liquidacion.cuadro.value" />
        <CamposDeExcepciones
          v-model="asignacion"
          :errores="errores"
          :hay-retencion="resumenDeDocumentos.conRetencion > 0"
          :con-retencion="resumenDeDocumentos.conRetencion"
          :retenido="resumenDeDocumentos.retenido"
        />
        <BotonBase tipo="submit" class="w-full" :cargando="liquidacion.enviando.value">Liquidar el vale</BotonBase>
      </div>
    </form>
    <VentanaDeValeDeGasto
      v-model="ventana.edicion.value"
      :abierta="ventana.abierta.value"
      :enviando="ventana.enviando.value"
      :errores="ventana.errores.value"
      :conceptos="liquidacion.conceptos.value"
      texto-del-boton="Agregar gasto"
      @cerrar="ventana.cerrar"
      @guardar="ventana.guardar"
    />
  </div>
</template>
