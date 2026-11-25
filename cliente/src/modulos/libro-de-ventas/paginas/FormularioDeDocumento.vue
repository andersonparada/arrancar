<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import BarraDeRegistro from '../componentes/registro/BarraDeRegistro.vue';
import CamposDeLaFel from '../componentes/registro/CamposDeLaFel.vue';
import CamposDelEncabezado from '../componentes/registro/CamposDelEncabezado.vue';
import EditorDeLineas from '../componentes/registro/EditorDeLineas.vue';
import MasDatosDelDocumento from '../componentes/registro/MasDatosDelDocumento.vue';
import ProblemaDelRegistro from '../componentes/registro/ProblemaDelRegistro.vue';
import { sumaDeLineas } from '../composables/documentos/lineas-del-documento';
import { usarRegistroDeDocumento } from '../composables/documentos/usar-registro-de-documento';
import { VENTANA_DE_DOCUMENTOS as ventana } from '../textos-de-documentos';

/** Registrar un factura, nota o recibo de venta. El IVA y el desglose los calcula el servidor al registrar. */
const router = useRouter();
const registro = usarRegistroDeDocumento();
const { edicion, catalogos } = registro;
const zonaDelProblema = ref<HTMLElement | null>(null);
const errores = () => ({ ...registro.erroresLocales.value, ...registro.errores.value });

// El motivo del rechazo se lee y se lleva el foco, para quien usa solo teclado o lector de pantalla.
watch(registro.problema, async (mensaje) => {
  if (!mensaje) return;
  await nextTick();
  zonaDelProblema.value?.querySelector<HTMLElement>('[role=alert]')?.focus();
});
/** Enter en un campo de texto no registra: se registra con el botón, así un Enter de más no guarda a medias. */
function alPresionarEnter(evento: KeyboardEvent): void {
  if (evento.target instanceof HTMLInputElement) evento.preventDefault();
}
</script>

<template>
  <form class="pb-2" novalidate @submit.prevent="registro.registrar" @keydown.enter="alPresionarEnter">
    <EncabezadoPagina
      :titulo="ventana.tituloDelRegistro"
      :volver="{ texto: ventana.titulo, ruta: { name: 'libro-de-ventas.documentos' } }"
    />
    <div v-if="registro.problema.value" ref="zonaDelProblema" class="mb-4">
      <ProblemaDelRegistro :mensaje="registro.problema.value" />
    </div>
    <div class="min-w-0 space-y-4">
      <TarjetaBase>
        <h2 class="mb-4 font-semibold">Datos del documento</h2>
        <CamposDelEncabezado
          v-model="edicion"
          :clientes="catalogos.clientes.value"
          :clientes-no-disponibles="catalogos.clientesNoDisponibles.value"
          :facturas="catalogos.facturas"
          :errores="errores()"
          :pide-el-iva="registro.pideElIva.value"
          @buscar-facturas="catalogos.buscarFacturas"
        />
      </TarjetaBase>
      <TarjetaBase>
        <h2 class="mb-4 font-semibold">Factura electrónica (FEL)</h2>
        <CamposDeLaFel v-model="edicion" :errores="errores()" />
      </TarjetaBase>
      <TarjetaBase>
        <h2 class="mb-4 font-semibold">Líneas</h2>
        <EditorDeLineas
          v-model="edicion.lineas"
          :conceptos="catalogos.conceptos.value"
          :conceptos-no-disponibles="catalogos.conceptosNoDisponibles.value"
          :errores="registro.errores.value"
          :intentado="registro.intentado.value"
        />
      </TarjetaBase>
      <MasDatosDelDocumento
        v-model="edicion"
        :con-cartera="catalogos.conCartera.value"
        :errores="errores()"
        :pide-el-iva="registro.pideElIva.value"
      />
    </div>
    <BarraDeRegistro
      :total="sumaDeLineas(edicion.lineas)"
      :pendientes="registro.pendientes.value"
      :enviando="registro.enviando.value"
      @cancelar="router.back()"
      @registrar-otro="registro.registrarYOtro"
    />
  </form>
</template>
