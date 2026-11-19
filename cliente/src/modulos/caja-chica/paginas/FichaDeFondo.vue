<script setup lang="ts">
import { reactive } from 'vue';
import { Landmark } from 'lucide-vue-next';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDelFondo from '../componentes/AccionesDelFondo.vue';
import ResumenDelFondo from '../componentes/ResumenDelFondo.vue';
import SeccionDeComprobantes from '../componentes/SeccionDeComprobantes.vue';
import SeccionDeHistorial from '../componentes/SeccionDeHistorial.vue';
import SeccionDeRetenciones from '../componentes/SeccionDeRetenciones.vue';
import VentanasDeLaFicha from '../componentes/VentanasDeLaFicha.vue';
import { usarAccionesDeComprobantes } from '../composables/comprobantes/usar-acciones-de-comprobantes';
import { usarAccionesDelFondo } from '../composables/fondos/usar-acciones-del-fondo';
import { usarFichaDelFondo } from '../composables/fondos/usar-ficha-del-fondo';
import { VENTANAS_CAJA_CHICA } from '../textos';

const props = defineProps<{ id: string }>();
const ficha = usarFichaDelFondo(props.id);
const acciones = reactive(usarAccionesDelFondo(ficha.fondo, ficha.recargar));
const comprobantes = reactive(usarAccionesDeComprobantes(() => ficha.fondo.value, ficha.recargar));
const volver = { texto: 'Fondos de caja chica', ruta: { name: 'caja-chica.fondos' } };
</script>

<template>
  <div>
    <p v-if="ficha.cargando.value" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <template v-else-if="ficha.fondo.value">
      <EncabezadoPagina
        :titulo="ficha.fondo.value.nombre"
        :descripcion="VENTANAS_CAJA_CHICA.fondos.ficha"
        :volver="volver"
      >
        <AccionesDelFondo
          :fondo="ficha.fondo.value"
          @aumentar="acciones.aumentar.abrir"
          @disminuir="acciones.disminuir.abrir"
          @custodio="acciones.custodio.abrir"
          @anular="acciones.anulacion.abrir"
        />
      </EncabezadoPagina>

      <div class="space-y-6">
        <ResumenDelFondo :partes="ficha.ecuacion.value" :avisos="ficha.fondo.value.avisos" />
        <SeccionDeRetenciones
          :documentos="ficha.conRetencion.value"
          @asignar="comprobantes.asignacion.pedir([$event], ficha.fondo.value)"
        />
        <SeccionDeComprobantes
          v-model:estado="ficha.estado.value"
          :lista="ficha.comprobantes.value"
          :cargando="ficha.cargandoComprobantes.value"
          :puede-cambiar="acciones.abierto"
          @agregar-factura="comprobantes.agregarFactura"
          @desde-la-bandeja="comprobantes.desdeLaBandeja"
          @vale-de-gasto="comprobantes.vale.abrir"
          @devolver="comprobantes.baja.pedir($event, 'devolver')"
          @anular="comprobantes.baja.pedir($event, 'anular')"
        />
        <section aria-label="Datos del fondo">
          <DatosDelRegistro :detalles="ficha.detalles.value" />
        </section>
        <SeccionDeHistorial :custodios="ficha.fondo.value.custodios" :cambios="ficha.fondo.value.cambiosDeMonto" />
      </div>
      <VentanasDeLaFicha :fondo="ficha.fondo.value" :acciones="acciones" :comprobantes="comprobantes" />
    </template>
    <EstadoVacio
      v-else
      :icono="Landmark"
      titulo="No se encontró este fondo"
      descripcion="No existe o no lo tiene asignado. Pida que se lo asignen desde Fondos, en Accesos."
    />
  </div>
</template>
