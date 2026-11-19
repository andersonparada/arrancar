<script setup lang="ts">
import { Save } from 'lucide-vue-next';
import {
  OPCIONES_DE_PUERTO,
  textoDelEstadoDelServidor,
  type BorradorDelServidor,
} from '../../composables/correo/servidor-de-correo';
import type { ServidorDeCorreo } from '../../servicios/correo-de-soporte.api';
import BotonBase from '../BotonBase.vue';
import CampoInterruptor from '../CampoInterruptor.vue';
import CampoSelector from '../CampoSelector.vue';
import CampoTexto from '../CampoTexto.vue';
import TarjetaBase from '../TarjetaBase.vue';

/**
 * El servidor SMTP de la instalación. La contraseña es de solo escritura: nunca se muestra; vacía, se conserva la
 * guardada. Sin cifrado no hay opción: el puerto decide STARTTLS (587) o TLS directo (465).
 */
defineProps<{
  guardado: ServidorDeCorreo;
  errores: Record<string, string>;
  enviando: boolean;
  hayCambios: boolean;
  sinContrasena: boolean;
}>();
const emit = defineEmits<{ guardar: [] }>();
const borrador = defineModel<BorradorDelServidor>({ required: true });
</script>

<template>
  <TarjetaBase>
    <form class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <div class="flex items-start justify-between gap-3">
        <h2 class="font-semibold">Servidor de correo</h2>
        <p class="text-xs text-tierra-500" role="status">{{ textoDelEstadoDelServidor(guardado) }}</p>
      </div>
      <p
        v-if="!guardado.llaveDisponible"
        class="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        role="alert"
      >
        Falta la llave de secretos (<code>CLAVE_SECRETOS</code>) en el servidor: no se puede guardar la contraseña ni
        enviar correos. Agréguela al entorno y reinicie.
      </p>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="borrador.servidor"
          etiqueta="Servidor"
          requerido
          sin-correccion
          :error="errores.servidor"
        />
        <CampoSelector v-model="borrador.puerto" etiqueta="Puerto y cifrado" :opciones="OPCIONES_DE_PUERTO" requerido />
        <CampoTexto v-model="borrador.usuario" etiqueta="Usuario" requerido sin-correccion :error="errores.usuario" />
        <CampoTexto
          v-model="borrador.contrasena"
          etiqueta="Contraseña"
          tipo="password"
          autocompletar="new-password"
          sin-correccion
          :placeholder="guardado.contrasenaConfigurada ? '•••••••• (guardada)' : ''"
          :ayuda="
            guardado.contrasenaConfigurada ? 'Déjela vacía para conservar la guardada.' : 'Hace falta para activarlo.'
          "
          :error="errores.contrasena"
        />
        <CampoTexto
          v-model="borrador.remitenteDireccion"
          etiqueta="Dirección del remitente"
          tipo="email"
          requerido
          sin-correccion
          ayuda="Use una dirección de su dominio con SPF, DKIM y DMARC, como notificaciones@su-dominio."
          :error="errores.remitenteDireccion"
        />
        <CampoTexto
          v-model="borrador.remitenteNombre"
          etiqueta="Nombre del remitente"
          requerido
          :longitud-maxima="80"
          :error="errores.remitenteNombre"
        />
      </div>
      <CampoInterruptor
        v-model="borrador.activo"
        etiqueta="Enviar correos"
        descripcion="Apagado, todo queda pendiente en la bandeja hasta que se active."
      />
      <p v-if="sinContrasena" class="text-sm text-red-700 dark:text-red-300" role="alert">
        Escriba la contraseña para poder activar el servidor.
      </p>
      <div class="flex justify-end">
        <BotonBase tipo="submit" :icono="Save" :cargando="enviando" :deshabilitado="!hayCambios || sinContrasena">
          Guardar
        </BotonBase>
      </div>
    </form>
  </TarjetaBase>
</template>
