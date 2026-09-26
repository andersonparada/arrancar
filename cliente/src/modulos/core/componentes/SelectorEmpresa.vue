<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { usarAvisos } from '../almacenes/avisos';
import { usarSesion } from '../almacenes/sesion';

const sesion = usarSesion();
const avisos = usarAvisos();
const router = useRouter();

const grupos = computed(() => {
  const porCuenta = new Map<string, { cuenta: string; empresas: typeof sesion.empresasDisponibles }>();
  for (const empresa of sesion.empresasDisponibles) {
    const grupo = porCuenta.get(empresa.cuentaId) ?? { cuenta: empresa.cuentaNombre, empresas: [] };
    grupo.empresas.push(empresa);
    porCuenta.set(empresa.cuentaId, grupo);
  }
  return [...porCuenta.values()];
});

async function cambiar(evento: Event): Promise<void> {
  const empresaId = (evento.target as HTMLSelectElement).value;
  try {
    await sesion.cambiarEmpresa(empresaId);
    await router.push({ name: 'inicio' });
    avisos.info(`Trabajando en ${sesion.empresa?.nombre}`);
  } catch (error) {
    avisos.error(error instanceof Error ? error.message : 'No se pudo cambiar de empresa.');
  }
}
</script>

<template>
  <label class="block">
    <span class="sr-only">Empresa activa</span>
    <select
      :value="sesion.empresa?.id ?? ''"
      class="w-full truncate rounded-lg border-0 bg-marca-oscuro/60 py-2 pr-8 pl-3 text-sm font-medium text-marca-texto ring-1 ring-marca-texto/15 focus:ring-2 focus:ring-acento"
      @change="cambiar"
    >
      <option v-if="!sesion.empresa" value="" disabled>Elija una empresa</option>
      <optgroup v-for="grupo in grupos" :key="grupo.cuenta" :label="grupo.cuenta">
        <option v-for="empresa in grupo.empresas" :key="empresa.id" :value="empresa.id" class="text-tierra-900">
          {{ empresa.nombre }}
        </option>
      </optgroup>
    </select>
  </label>
</template>
