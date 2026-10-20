<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { TriangleAlert } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import BarraDeRegistro from '../componentes/registro/BarraDeRegistro.vue';
import CamposDeLaFel from '../componentes/registro/CamposDeLaFel.vue';
import CamposDelEncabezado from '../componentes/registro/CamposDelEncabezado.vue';
import EditorDeLineas from '../componentes/registro/EditorDeLineas.vue';
import MasDatosDelDocumento from '../componentes/registro/MasDatosDelDocumento.vue';
import ProblemaDelRegistro from '../componentes/registro/ProblemaDelRegistro.vue';
import VistaPreviaDelDocumento from '../componentes/registro/VistaPreviaDelDocumento.vue';
import { usarRegistroDeDocumento } from '../composables/documentos/usar-registro-de-documento';
import { FORMULARIO_DE_DOCUMENTO as textos } from '../textos-del-registro';

/** Registrar una factura, nota de crédito o recibo, con la vista previa del cálculo en vivo. */
const router = useRouter();
const registro = usarRegistroDeDocumento();
const { edicion, catalogos, previa, propuestas } = registro;
const volver = { texto: textos.volver, ruta: { name: 'libro-de-compras.documentos' } };
const zonaDelProblema = ref<HTMLElement | null>(null);
/** Enter en un campo de texto no registra: se registra con el botón, así un Enter de más no guarda a medias. */
function alPresionarEnter(evento: KeyboardEvent): void {
  if (evento.target instanceof HTMLInputElement) evento.preventDefault();
}

// Un problema nuevo se lleva a la vista: el usuario puede estar en el fondo de un formulario largo.
watch(registro.problema, async (problema) => {
  if (!problema) return;
  await nextTick();
  zonaDelProblema.value?.scrollIntoView({ block: 'center', behavior: 'smooth' });
});
</script>

<template>
  <form
    class="pb-2"
    novalidate
    @submit.prevent="registro.registrar"
    @focusout="previa.calcularYa"
    @keydown.enter="alPresionarEnter"
  >
    <EncabezadoPagina :titulo="textos.titulo" :descripcion="textos.descripcion" :volver="volver" />

    <p
      v-if="registro.sinDestinos.value"
      class="mb-4 flex gap-2 rounded-2xl bg-trigo-300/40 p-4 text-sm text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
      role="status"
    >
      <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ textos.sinDestinos }}</span>
    </p>
    <div v-if="registro.problema.value" ref="zonaDelProblema" class="mb-4">
      <ProblemaDelRegistro
        v-model="edicion.respuestasFiscales"
        :problema="registro.problema.value"
        :confirmado="edicion.confirmarCambioDeRegimen"
        @confirmar-regimen="edicion.confirmarCambioDeRegimen = true"
        @usar-periodo="edicion.periodo = $event"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
      <div class="min-w-0 space-y-4">
        <TarjetaBase>
          <h2 class="mb-4 font-semibold">Datos del documento</h2>
          <CamposDelEncabezado
            v-model="edicion"
            :proveedores="catalogos.proveedores.value"
            :destinos="catalogos.destinos.value"
            :facturas="registro.documentos.value"
            :conceptos="catalogos.conceptos.value"
            :periodo-propuesto="propuestas.periodo.value"
            :fecha-propuesta="
              propuestas.fechaDeRecepcion.value ? formatearFecha(propuestas.fechaDeRecepcion.value) : null
            "
            :errores="registro.erroresDelEncabezado.value"
          />
        </TarjetaBase>
        <TarjetaBase>
          <h2 class="mb-4 font-semibold">Factura electrónica (FEL)</h2>
          <CamposDeLaFel
            v-model="edicion"
            :nit-de-la-empresa="catalogos.nitDeLaEmpresa.value"
            :errores="registro.erroresDelEncabezado.value"
          />
        </TarjetaBase>
        <TarjetaBase>
          <h2 class="mb-4 font-semibold">Líneas</h2>
          <EditorDeLineas
            v-model="edicion.lineas"
            :conceptos="catalogos.conceptos.value"
            :combustibles="catalogos.combustibles.value"
            :errores="registro.erroresDeLineas.value"
            :tipo-dte="edicion.tipoDte"
          />
        </TarjetaBase>
        <MasDatosDelDocumento v-model="edicion" :errores="registro.erroresDelEncabezado.value" />
      </div>

      <div class="min-w-0 lg:sticky lg:top-4">
        <VistaPreviaDelDocumento
          v-model="edicion.ajustes"
          :respuesta="previa.respuesta.value"
          :calculando="previa.calculando.value"
          :desactualizada="previa.desactualizada.value"
        />
      </div>
    </div>

    <BarraDeRegistro
      :neto="previa.respuesta.value?.documento.netoAPagar ?? null"
      :pendientes="registro.pendientes.value"
      :enviando="registro.enviando.value"
      :puede-registrar="registro.puedeRegistrar.value"
      @cancelar="router.back()"
    />
  </form>
</template>
