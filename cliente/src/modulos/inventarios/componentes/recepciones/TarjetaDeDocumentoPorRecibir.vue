<script setup lang="ts">
import { computed } from 'vue';
import { PackageMinus, Undo2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { esNotaDeCredito, type DocumentoPorRecibir } from '../../composables/recepciones/agrupar-lineas';
import { documentoMarcado, recibiblesDe } from '../../composables/recepciones/seleccion-de-lineas';
import type { LineaPorRecibir } from '../../servicios/recepciones.api';

/**
 * Un documento del libro con sus líneas por recibir. Las de una factura se marcan para recibirlas juntas; las de una
 * nota de crédito se aplican con una devolución de mercadería o con una rebaja de costo.
 */
const props = defineProps<{ documento: DocumentoPorRecibir; seleccion: string[] }>();
const emit = defineEmits<{
  alternar: [id: string];
  marcarTodo: [marcar: boolean];
  descartar: [linea: LineaPorRecibir];
  devolver: [linea: LineaPorRecibir];
  rebajar: [linea: LineaPorRecibir];
}>();

const esNota = computed(() => props.documento.tipoDeDocumento === 'nota_de_credito');
const marcado = computed(() => documentoMarcado(props.seleccion, props.documento));
const hayRecibibles = computed(() => recibiblesDe(props.documento).length > 0);
</script>

<template>
  <TarjetaBase class="space-y-3">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="font-semibold">
          {{ documento.documento }}
          <InsigniaBase v-if="esNota" tono="trigo">Nota de crédito</InsigniaBase>
        </p>
        <p class="text-sm text-tierra-600 dark:text-tierra-300">
          {{ documento.proveedorNombre }} · {{ formatearFecha(documento.fechaEmision) }}
        </p>
      </div>
      <label
        v-if="hayRecibibles && documento.lineas.length > 1"
        class="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
      >
        <input
          type="checkbox"
          class="size-5 rounded border-tierra-300 text-campo-700 focus:ring-campo-500"
          :checked="marcado"
          @change="emit('marcarTodo', !marcado)"
        />
        Marcar todo
      </label>
    </div>
    <ul class="divide-y divide-tierra-100 dark:divide-tierra-800">
      <li v-for="linea in documento.lineas" :key="linea.lineaId" class="flex flex-wrap items-start gap-3 py-3">
        <input
          v-if="!esNotaDeCredito(linea)"
          type="checkbox"
          class="mt-1 size-5 shrink-0 rounded border-tierra-300 text-campo-700 focus:ring-campo-500"
          :checked="seleccion.includes(linea.lineaId)"
          :aria-label="`Recibir la línea ${linea.numeroDeLinea} de ${documento.documento}`"
          @change="emit('alternar', linea.lineaId)"
        />
        <div class="min-w-0 flex-1 basis-56">
          <p class="font-medium">{{ linea.conceptoNombre }}</p>
          <p v-if="linea.descripcion" class="text-sm text-tierra-600 dark:text-tierra-300">{{ linea.descripcion }}</p>
          <p class="text-sm">
            Costo {{ formatearMonto(linea.costo) }} · {{ esNota ? 'Aplicado' : 'Recibido' }}
            {{ formatearMonto(linea.recibido) }} ·
            <span class="font-medium">Pendiente {{ formatearMonto(linea.pendiente) }}</span>
          </p>
          <p v-if="linea.articuloSugeridoNombre && !esNota" class="text-xs text-tierra-500">
            Artículo sugerido: {{ linea.articuloSugeridoNombre }}
          </p>
          <p
            v-if="linea.anteriorALaFechaDeInicio"
            role="note"
            class="mt-1 rounded-lg bg-trigo-300/30 px-2 py-1 text-xs dark:bg-trigo-500/20"
          >
            Es anterior a la fecha de inicio de la empresa: si ya estaba en el saldo inicial, descártela para no
            contarla dos veces.
          </p>
        </div>
        <div class="flex flex-wrap gap-1">
          <span v-if="esNotaDeCredito(linea)" v-permiso="'inventarios.recepciones.crear'" class="contents">
            <BotonBase variante="secundario" pequeno :icono="Undo2" @click="emit('devolver', linea)">
              Devolver mercadería
            </BotonBase>
            <BotonBase variante="secundario" pequeno @click="emit('rebajar', linea)">Rebajar costo</BotonBase>
          </span>
          <span v-permiso="'inventarios.recepciones.descartar'" class="contents">
            <BotonBase variante="fantasma" pequeno :icono="PackageMinus" @click="emit('descartar', linea)">
              {{ esNotaDeCredito(linea) ? 'No es mercadería: descartar' : 'Descartar' }}
            </BotonBase>
          </span>
        </div>
      </li>
    </ul>
  </TarjetaBase>
</template>
