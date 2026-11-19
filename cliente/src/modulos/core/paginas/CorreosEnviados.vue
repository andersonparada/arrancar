<script setup lang="ts">
import { Mail } from 'lucide-vue-next';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import EstadoVacio from '../componentes/EstadoVacio.vue';
import FiltrosDeCorreos from '../componentes/correo/FiltrosDeCorreos.vue';
import PaginadorDeLista from '../componentes/correo/PaginadorDeLista.vue';
import TarjetaDeCorreo from '../componentes/correo/TarjetaDeCorreo.vue';
import VentanaDeCancelacionDeCorreo from '../componentes/correo/VentanaDeCancelacionDeCorreo.vue';
import VentanaDeCorreo from '../componentes/correo/VentanaDeCorreo.vue';
import { filtrosVacios, hayFiltros } from '../composables/correo/filtro-de-correos';
import { usarCorreosEnviados } from '../composables/correo/usar-correos-enviados';
import { VENTANAS_CORE } from '../textos';

/** Administración → Correos enviados: lo que la empresa mandó por correo, con su estado, y cancelar o reintentar. */
const correos = usarCorreosEnviados();
const { filtros, pagina, cargando, cancelacion, reintento } = correos;
const limpiarFiltros = () => Object.assign(filtros, filtrosVacios());
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="VENTANAS_CORE.correos.titulo" :descripcion="VENTANAS_CORE.correos.descripcion" />
    <FiltrosDeCorreos v-model="filtros" @limpiar="limpiarFiltros" />

    <p v-if="cargando && !pagina.elementos.length" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <EstadoVacio
      v-else-if="!pagina.elementos.length"
      :icono="Mail"
      :titulo="hayFiltros(filtros) ? 'Ningún correo coincide' : 'Todavía no hay correos'"
      :descripcion="
        hayFiltros(filtros)
          ? 'Cambie o quite los filtros.'
          : 'Aquí aparecen los avisos que la empresa manda por correo, por ejemplo los avisos de pago a proveedores.'
      "
    />
    <ul v-else class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <li v-for="correo in pagina.elementos" :key="correo.id">
        <TarjetaDeCorreo :correo="correo" @abrir="correos.abrir(correo.id)" />
      </li>
    </ul>
    <PaginadorDeLista v-model="filtros.pagina" :limite="pagina.limite" :total="pagina.total" />

    <VentanaDeCorreo
      :correo="correos.ficha.value"
      :reintentando="reintento.reintentando.value"
      @cerrar="correos.cerrarFicha"
      @cancelar="correos.ficha.value && cancelacion.abrir(correos.ficha.value.id)"
      @reintentar="correos.ficha.value && reintento.pedir(correos.ficha.value.id)"
    />
    <VentanaDeCancelacionDeCorreo
      v-model="cancelacion.motivo.value"
      :abierta="cancelacion.abierta.value"
      :asunto="correos.ficha.value?.asunto ?? ''"
      :errores="cancelacion.errores.value"
      :enviando="cancelacion.enviando.value"
      @cerrar="cancelacion.cerrar"
      @confirmar="cancelacion.confirmar"
    />
  </div>
</template>
