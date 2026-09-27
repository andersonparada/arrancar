<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { RotateCcw, Save, SlidersHorizontal } from 'lucide-vue-next';
import { usarAvisos } from '../almacenes/avisos';
import { usarSesion } from '../almacenes/sesion';
import BotonBase from '../componentes/BotonBase.vue';
import CampoInterruptor from '../componentes/CampoInterruptor.vue';
import CampoTexto from '../componentes/CampoTexto.vue';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import EstadoVacio from '../componentes/EstadoVacio.vue';
import InsigniaBase from '../componentes/InsigniaBase.vue';
import TarjetaBase from '../componentes/TarjetaBase.vue';
import { usarFormulario } from '../composables/usar-formulario';
import { configuracionApi, type NivelEditable, type VariableConfiguracion } from '../servicios/configuracion.api';

const sesion = usarSesion();
const avisos = usarAvisos();
const formulario = usarFormulario();
const variables = ref<VariableConfiguracion[]>([]);
/** Valor que se está editando por `clave:nivel`. */
const borradores = reactive<Record<string, unknown>>({});

const NOMBRES_ORIGEN = {
  predeterminado: 'Predeterminado',
  instalacion: 'Servidor',
  cuenta: 'Cuenta',
  empresa: 'Empresa',
} as const;

const nivelesEditables = (variable: VariableConfiguracion) =>
  variable.niveles.filter((n): n is NivelEditable => n === 'cuenta' || n === 'empresa');

const llave = (variable: VariableConfiguracion, nivel: NivelEditable) => `${variable.clave}:${nivel}`;

async function cargar(): Promise<void> {
  try {
    variables.value = await configuracionApi.listar();
    for (const variable of variables.value) {
      for (const nivel of nivelesEditables(variable)) {
        borradores[llave(variable, nivel)] = variable.valores[nivel] ?? null;
      }
    }
  } catch (error) {
    avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la configuración.');
  }
}

function convertir(variable: VariableConfiguracion, valor: unknown): unknown {
  return typeof variable.predeterminado === 'number' ? Number(valor) : valor;
}

async function guardar(variable: VariableConfiguracion, nivel: NivelEditable): Promise<void> {
  const valor = convertir(variable, borradores[llave(variable, nivel)]);
  const exito = await formulario.enviar(() => configuracionApi.establecer(variable.clave, nivel, valor));
  if (!exito) return;
  avisos.exito('Configuración guardada.');
  await Promise.all([cargar(), sesion.cargar()]);
}

async function restablecer(variable: VariableConfiguracion, nivel: NivelEditable): Promise<void> {
  const exito = await formulario.enviar(() => configuracionApi.restablecer(variable.clave, nivel));
  if (!exito) return;
  avisos.exito('Se usará el valor heredado.');
  await Promise.all([cargar(), sesion.cargar()]);
}

onMounted(cargar);
</script>

<template>
  <div>
    <EncabezadoPagina
      titulo="Configuración"
      :descripcion="`Ajustes de la cuenta y de ${sesion.empresa?.nombre}. El valor de la empresa tiene prioridad sobre el de la cuenta, y este sobre el del servidor.`"
    />

    <EstadoVacio v-if="!variables.length" :icono="SlidersHorizontal" titulo="Sin variables de configuración" />
    <ul v-else class="space-y-3">
      <li v-for="variable in variables" :key="variable.clave">
        <TarjetaBase class="space-y-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="font-medium">{{ variable.descripcion }}</p>
              <p class="font-mono text-xs text-tierra-400">{{ variable.clave }}</p>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="text-tierra-500">Valor actual:</span>
              <strong>{{ variable.efectivo }}</strong>
              <InsigniaBase :tono="variable.origen === 'predeterminado' ? 'tierra' : 'campo'">{{
                NOMBRES_ORIGEN[variable.origen]
              }}</InsigniaBase>
            </div>
          </div>

          <div v-if="sesion.puede('configuracion.gestionar')" class="grid gap-3 sm:grid-cols-2">
            <div v-for="nivel in nivelesEditables(variable)" :key="nivel" class="flex items-end gap-2">
              <CampoInterruptor
                v-if="typeof variable.predeterminado === 'boolean'"
                :model-value="Boolean(borradores[llave(variable, nivel)])"
                class="flex-1"
                :etiqueta="`Por ${nivel}`"
                @update:model-value="borradores[llave(variable, nivel)] = $event"
              />
              <CampoTexto
                v-else
                :model-value="(borradores[llave(variable, nivel)] as string | number | null) ?? null"
                class="flex-1"
                :etiqueta="`Por ${nivel}`"
                :tipo="typeof variable.predeterminado === 'number' ? 'number' : 'text'"
                :placeholder="`Heredado: ${variable.valores.instalacion ?? variable.predeterminado}`"
                @update:model-value="borradores[llave(variable, nivel)] = $event"
              />
              <BotonBase
                variante="secundario"
                :icono="Save"
                :aria-label="`Guardar por ${nivel}`"
                @click="guardar(variable, nivel)"
              />
              <BotonBase
                v-if="variable.valores[nivel] !== undefined"
                variante="fantasma"
                :icono="RotateCcw"
                :aria-label="`Quitar valor por ${nivel}`"
                title="Volver a heredar"
                @click="restablecer(variable, nivel)"
              />
            </div>
          </div>
        </TarjetaBase>
      </li>
    </ul>
  </div>
</template>
