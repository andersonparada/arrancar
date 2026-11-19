<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { FondoParaAsignar, UsuarioParaAccesosAFondos } from '../servicios/accesos-a-fondos.api';

/** Reparte los fondos de un usuario: elige al usuario, marca los fondos y guarda el conjunto final. */
const props = defineProps<{
  abierta: boolean;
  cargando: boolean;
  enviando: boolean;
  usuario: UsuarioParaAccesosAFondos | null;
  opciones: OpcionDeRegistro[];
  fondos: FondoParaAsignar[];
  seleccion: string[];
  resumen: string | null;
  esPropio: boolean;
}>();
const usuarioId = defineModel<string | null>('usuarioId', { required: true });
const emit = defineEmits<{ cerrar: []; alternar: [id: string]; marcar: [marcar: boolean]; guardar: [] }>();

const informativo = computed(() => props.usuario?.veTodos ?? false);
const todosMarcados = computed(() => props.fondos.every((f) => props.seleccion.includes(f.id)));
const puedeGuardar = computed(() => !!props.usuario && !informativo.value && !!props.resumen && !props.cargando);
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Accesos a fondos" ancha @cerrar="emit('cerrar')">
    <div class="space-y-4">
      <CampoSelector v-model="usuarioId" etiqueta="Usuario" :opciones="opciones" />
      <p
        v-if="esPropio && !informativo"
        class="rounded-lg bg-trigo-300/30 px-3 py-2 text-sm dark:bg-trigo-500/20"
        role="status"
      >
        Es usted: al guardar se está dando acceso a sí mismo. Queda registrado en la auditoría.
      </p>
      <p
        v-if="informativo"
        class="rounded-lg bg-campo-50 px-3 py-2 text-sm text-campo-800 dark:bg-campo-900 dark:text-campo-100"
        role="status"
      >
        Este usuario ya ve todos los fondos por sus permisos. No necesita asignaciones; las casillas son solo
        informativas.
      </p>

      <p v-if="!usuario" class="text-sm text-tierra-500">Elija un usuario para ver y cambiar sus fondos.</p>
      <p v-else-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
      <p v-else-if="!fondos.length" class="text-sm text-tierra-500">
        Todavía no hay fondos. Abra el primero desde la lista.
      </p>
      <fieldset v-else :disabled="informativo || enviando" class="space-y-2">
        <legend class="sr-only">Fondos de {{ usuario.usuario }}</legend>
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm text-tierra-500" aria-live="polite">
            {{ informativo ? fondos.length : seleccion.length }} de {{ fondos.length }} marcados
          </p>
          <BotonBase v-if="!informativo" variante="fantasma" pequeno @click="emit('marcar', !todosMarcados)">
            {{ todosMarcados ? 'Desmarcar todos' : 'Marcar todos' }}
          </BotonBase>
        </div>
        <ul
          class="divide-y divide-tierra-100 rounded-lg ring-1 ring-tierra-200 dark:divide-tierra-800 dark:ring-tierra-700"
        >
          <li v-for="fondo in fondos" :key="fondo.id">
            <label class="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                class="size-5 rounded border-tierra-300 text-campo-700 focus:ring-campo-500"
                :checked="informativo || seleccion.includes(fondo.id)"
                @change="emit('alternar', fondo.id)"
              />
              <span class="min-w-0 flex-1 truncate">{{ fondo.nombre }}</span>
              <InsigniaBase v-if="fondo.estado === 'cerrado'" tono="tierra">Cerrado</InsigniaBase>
            </label>
          </li>
        </ul>
        <p v-if="resumen" class="text-sm font-medium" role="status">{{ resumen }}</p>
      </fieldset>
    </div>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cerrar</BotonBase>
      <BotonBase :deshabilitado="!puedeGuardar" :cargando="enviando" @click="emit('guardar')"
        >Guardar accesos</BotonBase
      >
    </template>
  </VentanaModal>
</template>
