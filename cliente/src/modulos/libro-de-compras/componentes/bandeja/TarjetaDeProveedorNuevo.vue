<script setup lang="ts">
import { computed, useId } from 'vue';
import { TriangleAlert } from 'lucide-vue-next';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import {
  problemasDelProveedorNuevo,
  type EdicionDeProveedorNuevo,
} from '../../composables/bandeja/datos-de-proveedores-nuevos';
import type { TipoDePersonaDelProveedor } from '../../servicios/dte-recibidos.api';

/**
 * Un proveedor nuevo por NIT: cómo se llamará en Proveedores. Cada tipo de persona guarda lo que se escribió en él,
 * así que cambiar de tipo y volver no pierde nada. Los largos se avisan al intentar confirmar, no al escribir.
 */
const props = defineProps<{ mostrarProblemas: boolean }>();
const edicion = defineModel<EdicionDeProveedorNuevo>({ required: true });
const grupo = useId();

const TIPOS: { valor: TipoDePersonaDelProveedor; texto: string }[] = [
  { valor: 'individual', texto: 'Individual' },
  { valor: 'juridica', texto: 'Empresa (jurídica)' },
];
const problemas = computed(() => (props.mostrarProblemas ? problemasDelProveedorNuevo(edicion.value) : {}));
const textoDeFacturas = computed(() => (edicion.value.filas === 1 ? '1 factura' : `${edicion.value.filas} facturas`));
</script>

<template>
  <fieldset class="min-w-0 space-y-3 rounded-lg border border-tierra-200 p-3 dark:border-tierra-700">
    <legend class="px-1 text-sm font-semibold break-words">Proveedor nuevo · NIT {{ edicion.nit }}</legend>
    <p class="text-xs break-words text-tierra-500 dark:text-tierra-300">
      En el DTE: «{{ edicion.nombreDelDte }}» · {{ textoDeFacturas }}
    </p>
    <p v-if="edicion.accion === 'agregar_papel'" class="text-sm break-words">
      Ya está en Terceros como «{{ edicion.nombreExistente }}»: se le agregará el papel de proveedor.
    </p>
    <template v-else>
      <div role="radiogroup" :aria-labelledby="`${grupo}-tipo`" class="space-y-1.5">
        <p :id="`${grupo}-tipo`" class="text-sm font-medium text-tierra-700 dark:text-tierra-200">Tipo de persona</p>
        <div class="grid grid-cols-2 gap-2">
          <label
            v-for="tipo in TIPOS"
            :key="tipo.valor"
            class="flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-2 text-center text-sm ring-1 ring-tierra-200 has-checked:bg-campo-600 has-checked:text-white has-checked:ring-campo-600 has-focus-visible:ring-2 has-focus-visible:ring-campo-500 dark:ring-tierra-700"
          >
            <input v-model="edicion.tipo" type="radio" class="sr-only" :name="grupo" :value="tipo.valor" />
            {{ tipo.texto }}
          </label>
        </div>
      </div>
      <template v-if="edicion.tipo === 'individual'">
        <CampoTexto v-model="edicion.nombres" etiqueta="Nombres" requerido :error="problemas.nombres" />
        <CampoTexto v-model="edicion.apellidos" etiqueta="Apellidos" :error="problemas.apellidos" />
        <p
          v-if="edicion.revisarContraElRtu"
          class="flex gap-2 rounded-lg bg-trigo-300/40 p-2 text-xs text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
        >
          <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            El DTE no separa nombres de apellidos y puede ser el nombre de su negocio. Revíselo contra el RTU; si es una
            empresa, elija «Empresa (jurídica)».
          </span>
        </p>
      </template>
      <CampoTexto
        v-else
        v-model="edicion.razonSocial"
        etiqueta="Razón social"
        requerido
        :error="problemas.razonSocial"
      />
      <p class="text-xs text-tierra-500 dark:text-tierra-300">
        Lo propuso Arrancar con el nombre del DTE: revíselo; se guarda así en Proveedores.
      </p>
    </template>
  </fieldset>
</template>
