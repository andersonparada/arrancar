<script setup lang="ts">
import { CheckCheck, Inbox } from 'lucide-vue-next';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import BarraDeSeleccion from '../componentes/BarraDeSeleccion.vue';
import TarjetaDeBandeja from '../componentes/TarjetaDeBandeja.vue';
import { usarBandeja } from '../composables/usar-bandeja';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.bandeja;
const bandeja = usarBandeja();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" />

    <p
      v-if="bandeja.cargando.value && bandeja.documentos.value.length === 0"
      class="text-sm text-tierra-500"
      role="status"
    >
      Cargando…
    </p>
    <EstadoVacio
      v-else-if="bandeja.documentos.value.length === 0"
      :icono="Inbox"
      titulo="No hay nada por completar"
      descripcion="Los documentos que se registren en el libro de compras con destino a Cuentas por pagar llegan aquí."
    />
    <template v-else>
      <p
        v-if="bandeja.total.value > bandeja.documentos.value.length"
        class="mb-3 text-sm text-trigo-700 dark:text-trigo-300"
        role="status"
      >
        Hay {{ bandeja.total.value }} documentos pendientes y aquí se ven los {{ bandeja.documentos.value.length }} más
        antiguos. Al completarlos, aparecen los siguientes.
      </p>
      <label v-if="bandeja.puedeCompletar" class="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          class="size-5 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
          :checked="bandeja.todoSeleccionado.value"
          @change="bandeja.alternarTodos"
        />
        Marcar todos (de 100 en 100)
      </label>
      <ul class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" :aria-busy="bandeja.cargando.value">
        <li v-for="documento in bandeja.documentos.value" :key="documento.id">
          <TarjetaDeBandeja
            v-model:vencimiento="bandeja.vencimientos.value[documento.id]"
            :documento="documento"
            :marcado="bandeja.seleccion.value.includes(documento.id)"
            :puede-marcar="bandeja.puedeCompletar && documento.puedeRegistrar"
            :error="bandeja.errores.value[documento.id]"
            @alternar="bandeja.alternar(documento.id)"
          />
        </li>
      </ul>
      <BarraDeSeleccion
        v-permiso="'cuentas-por-pagar.documentos.registrar'"
        :cantidad="bandeja.seleccion.value.length"
        accion="Completar"
        :icono="CheckCheck"
        invitacion="Marque los documentos que quiere completar."
        :aviso="bandeja.avisoDeLote.value"
        :enviando="bandeja.enviando.value"
        @accion="bandeja.completar"
        @limpiar="bandeja.limpiar"
      />
    </template>
  </div>
</template>
