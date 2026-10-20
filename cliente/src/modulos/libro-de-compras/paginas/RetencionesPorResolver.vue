<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import NavegacionDeRetenciones from '../componentes/retenciones/NavegacionDeRetenciones.vue';
import TarjetaPorResolver from '../componentes/retenciones/TarjetaPorResolver.vue';
import VentanaDeResolucion from '../componentes/retenciones/VentanaDeResolucion.vue';
import { usarPendientesPorResolver, usarPorResolver } from '../composables/retenciones/usar-por-resolver';
import { VENTANA_POR_RESOLVER as textos } from '../textos-de-retenciones';

const pendientes = usarPendientesPorResolver();
const resolver = usarPorResolver(pendientes.recargar);
const { lista, retenciones, cargando, abierta, objetivo, resolucion, nota, enviando, errores } = resolver;
const pestanas = [
  { valor: 'pendiente', texto: textos.pendientes },
  { valor: 'resueltas', texto: textos.resueltas },
] as const;
</script>

<template>
  <div class="min-w-0">
    <EncabezadoPagina :titulo="textos.titulo" :descripcion="textos.descripcion" />
    <NavegacionDeRetenciones :pendientes="pendientes.cantidad.value" />

    <div class="mb-4 inline-flex rounded-lg bg-tierra-100 p-1 dark:bg-tierra-800" role="group" aria-label="Qué mostrar">
      <button
        v-for="opcion in pestanas"
        :key="opcion.valor"
        type="button"
        class="rounded-md px-4 py-1.5 text-sm font-medium"
        :class="
          lista === opcion.valor
            ? 'bg-white shadow-sm dark:bg-tierra-600'
            : 'text-tierra-600 hover:text-tierra-900 dark:text-tierra-300 dark:hover:text-white'
        "
        :aria-pressed="lista === opcion.valor"
        @click="lista = opcion.valor"
      >
        {{ opcion.texto }}
      </button>
    </div>

    <p v-if="cargando && !retenciones" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <template v-else-if="retenciones">
      <EstadoVacio
        v-if="retenciones.length === 0"
        :icono="ShieldCheck"
        :titulo="lista === 'pendiente' ? textos.vacioPendientes : textos.vacioResueltas"
        :descripcion="lista === 'pendiente' ? textos.vacioPendientesAyuda : undefined"
      />
      <ul v-else class="flex flex-col gap-3" :class="{ 'opacity-60': cargando }" :aria-busy="cargando">
        <TarjetaPorResolver
          v-for="retencion in retenciones"
          :key="retencion.id"
          :retencion="retencion"
          @resolver="resolver.abrir(retencion)"
        />
      </ul>
    </template>

    <VentanaDeResolucion
      v-model:resolucion="resolucion"
      v-model:nota="nota"
      :abierta="abierta"
      :retencion="objetivo"
      :enviando="enviando"
      :errores="errores"
      @guardar="resolver.guardar"
      @cerrar="abierta = false"
    />
  </div>
</template>
