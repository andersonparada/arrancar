import { defineStore } from 'pinia';
import { computed, ref, type Ref } from 'vue';
import { ErrorApi } from '../servicios/cliente-http';
import { apiSesion, type ResumenSesion } from '../servicios/sesion.api';

/** Lo que se lee del resumen: quién es, dónde está y qué puede hacer. */
function lecturasDelResumen(resumen: Ref<ResumenSesion | null>) {
  const permisos = computed(() => new Set(resumen.value?.permisos ?? []));
  const modulosActivos = computed(() => new Set(resumen.value?.modulosActivos ?? []));

  return {
    usuario: computed(() => resumen.value?.usuario ?? null),
    empresa: computed(() => resumen.value?.empresa ?? null),
    autenticado: computed(() => resumen.value !== null),
    esSuperacceso: computed(() => resumen.value?.usuario.esSuperacceso ?? false),
    empresasDisponibles: computed(() => resumen.value?.empresasDisponibles ?? []),
    rolNombre: computed(() => resumen.value?.rolNombre ?? null),
    /** Indica si el usuario tiene el permiso en la empresa activa. */
    puede: (permiso: string) => permisos.value.has(permiso),
    moduloActivo: (clave: string) => modulosActivos.value.has(clave),
    /** Valor efectivo de una variable de configuración pública, o `predeterminado` si no llegó. */
    config: <T>(clave: string, predeterminado: T): T => {
      const valor = resumen.value?.configuracion[clave];
      return valor === undefined ? predeterminado : (valor as T);
    },
  };
}

/** El resumen del servidor, o nada si no hay sesión (401); cualquier otro error sigue su curso. */
async function resumenDelServidor(): Promise<ResumenSesion | null> {
  try {
    return await apiSesion.obtener();
  } catch (error) {
    if (error instanceof ErrorApi && error.estado === 401) return null;
    throw error;
  }
}

/** Lo que cambia la sesión: cargarla, entrar, salir y cambiar de empresa. */
function accionesDeSesion(resumen: Ref<ResumenSesion | null>, cargada: Ref<boolean>) {
  const limpiar = (): void => {
    resumen.value = null;
  };

  async function cargar(): Promise<void> {
    try {
      resumen.value = await resumenDelServidor();
    } finally {
      cargada.value = true;
    }
  }

  return {
    cargar,
    limpiar,
    iniciarSesion: (usuario: string, contrasena: string) => apiSesion.iniciarSesion(usuario, contrasena).then(cargar),
    cerrarSesion: () => apiSesion.cerrarSesion().then(limpiar, limpiar),
    cambiarEmpresa: async (empresaId: string) => void (resumen.value = await apiSesion.cambiarEmpresa(empresaId)),
  };
}

/** Estado de la sesión: usuario, empresa activa, módulos y permisos efectivos. */
export const usarSesion = defineStore('sesion', () => {
  const resumen = ref<ResumenSesion | null>(null);
  const cargada = ref(false);
  return { cargada, ...lecturasDelResumen(resumen), ...accionesDeSesion(resumen, cargada) };
});
