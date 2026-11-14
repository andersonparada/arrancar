<script setup lang="ts">
import { FileText } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import type { DocumentosDisponibles } from '../servicios/tipos-de-contrasenas';
import FilaDeDocumentoParaContrasena from './FilaDeDocumentoParaContrasena.vue';

/** Lo que el proveedor tiene disponible, con casillas: primero las facturas por pagar y luego las notas a favor. */
const props = defineProps<{
  disponibles: DocumentosDisponibles;
  cargando: boolean;
  hayProveedor: boolean;
  cargosMarcados: string[];
  notasMarcadas: string[];
  error?: string;
}>();
defineEmits<{
  alternarCargo: [id: string];
  alternarNota: [id: string];
  marcarCargos: [marcar: boolean];
  marcarNotas: [marcar: boolean];
}>();
const todosLosCargos = () => props.cargosMarcados.length === props.disponibles.cargos.length;
const todasLasNotas = () => props.notasMarcadas.length === props.disponibles.notas.length;
</script>

<template>
  <p v-if="!hayProveedor" class="text-sm text-tierra-600 dark:text-tierra-300">
    Escoja el proveedor para ver sus facturas por pagar.
  </p>
  <p v-else-if="cargando" class="text-sm text-tierra-500" role="status">Buscando documentos…</p>
  <EstadoVacio
    v-else-if="disponibles.cargos.length === 0"
    :icono="FileText"
    titulo="Este proveedor no tiene facturas disponibles"
    descripcion="Solo entran facturas con saldo por pagar que no estén ya en otra contraseña vigente. Si falta alguna, revise que no esté anulada."
  />
  <div v-else class="space-y-5">
    <p v-if="error" class="text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>
    <section aria-labelledby="titulo-de-facturas">
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 id="titulo-de-facturas" class="font-medium">Facturas por pagar ({{ disponibles.cargos.length }})</h3>
        <BotonBase variante="fantasma" pequeno @click="$emit('marcarCargos', !todosLosCargos())">
          {{ todosLosCargos() ? 'Quitar todas' : 'Marcar todas' }}
        </BotonBase>
      </div>
      <ul class="space-y-2">
        <li v-for="cargo in disponibles.cargos" :key="cargo.documentoId">
          <FilaDeDocumentoParaContrasena
            :cargo="cargo"
            :marcado="cargosMarcados.includes(cargo.documentoId)"
            @alternar="$emit('alternarCargo', cargo.documentoId)"
          />
        </li>
      </ul>
    </section>
    <section v-if="disponibles.notas.length > 0" aria-labelledby="titulo-de-notas">
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="titulo-de-notas" class="font-medium">Notas de crédito a favor ({{ disponibles.notas.length }})</h3>
          <p class="text-sm text-tierra-600 dark:text-tierra-300">Las que marque se restan de las facturas.</p>
        </div>
        <BotonBase variante="fantasma" pequeno @click="$emit('marcarNotas', !todasLasNotas())">
          {{ todasLasNotas() ? 'Quitar todas' : 'Marcar todas' }}
        </BotonBase>
      </div>
      <ul class="space-y-2">
        <li v-for="nota in disponibles.notas" :key="nota.documentoId">
          <FilaDeDocumentoParaContrasena
            :nota="nota"
            :marcado="notasMarcadas.includes(nota.documentoId)"
            @alternar="$emit('alternarNota', nota.documentoId)"
          />
        </li>
      </ul>
    </section>
  </div>
</template>
