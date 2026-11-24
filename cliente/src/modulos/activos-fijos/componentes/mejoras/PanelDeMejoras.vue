<script setup lang="ts">
import { Hammer, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { NOMBRES_DE_CLASE_DE_MEJORA } from '../../composables/mejoras/edicion-de-mejora';
import type { Mejora } from '../../servicios/mejoras.api';

/** La pestaña Mejoras de la ficha: lo que se le agregó al activo después de ponerlo en uso, y cómo deshacerlo. */
defineProps<{ mejoras: Mejora[]; cargando: boolean }>();
const emit = defineEmits<{ registrar: []; anular: [mejora: Mejora] }>();

function detalles(mejora: Mejora): DetalleDeRegistro[] {
  const filas: DetalleDeRegistro[] = [
    { etiqueta: 'Clase', valor: NOMBRES_DE_CLASE_DE_MEJORA[mejora.clase] },
    { etiqueta: 'Fecha', valor: formatearFecha(mejora.fecha) },
    { etiqueta: 'Descripción', valor: mejora.descripcion, largo: true },
  ];
  if (mejora.vidaUtilRestanteContableMeses !== null)
    filas.push({ etiqueta: 'Vida restante', valor: `${mejora.vidaUtilRestanteContableMeses} meses` });
  if (mejora.estado === 'anulada')
    filas.push({ etiqueta: 'Anulada', valor: mejora.motivoDeAnulacion ?? '', largo: true });
  return filas;
}
</script>

<template>
  <section aria-labelledby="titulo-de-mejoras" class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="titulo-de-mejoras" class="text-sm font-semibold text-tierra-600 dark:text-tierra-300">
        Mejoras y costos posteriores
      </h2>
      <BotonBase v-permiso="'activos-fijos.mejoras.crear'" :icono="Plus" @click="emit('registrar')">
        Registrar mejora o costo posterior
      </BotonBase>
    </div>

    <p v-if="cargando && !mejoras.length" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio
      v-else-if="!mejoras.length"
      :icono="Hammer"
      titulo="Este activo no tiene mejoras ni costos posteriores"
      descripcion="Registre aquí lo que se le agrega después de ponerlo en uso: una ampliación, un flete que llegó tarde o una nota de crédito."
    />
    <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <li v-for="mejora in mejoras" :key="mejora.id">
        <TarjetaDeRegistro
          :titulo="`${formatearMonto(mejora.monto)} · ${mejora.anioDeNumero}-${String(mejora.numero).padStart(4, '0')}`"
          :detalles="detalles(mejora)"
          permiso="activos-fijos.mejoras.anular"
          :insignia="mejora.estado === 'anulada' ? 'Anulada' : undefined"
          :class="{ 'opacity-60': mejora.estado === 'anulada' }"
          sin-editar
        >
          <template #acciones-extra>
            <BotonBase
              v-if="mejora.estado === 'vigente'"
              v-permiso="'activos-fijos.mejoras.anular'"
              variante="fantasma"
              pequeno
              @click="emit('anular', mejora)"
            >
              Anular
            </BotonBase>
          </template>
        </TarjetaDeRegistro>
      </li>
    </ul>
  </section>
</template>
