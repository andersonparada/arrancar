import { Mediador } from './aplicacion/mediador.js';
import { ModulosActivosDeLaCuentaEnRegistro } from './infraestructura/modulos-activos-de-la-cuenta-en-registro.js';

/**
 * Instancia única del mediador entre módulos (como `busEventos` para los eventos):
 * cada módulo importa `mediador` en su `modulo.ts` para registrar lo que atiende
 * (`atender`, `escuchar`) y, quien envía, lo hace desde el adaptador de su propio
 * puerto en `infraestructura/` (ver `docs/ARQUITECTURA.md`).
 */
export const mediador = new Mediador({ modulosActivos: new ModulosActivosDeLaCuentaEnRegistro() });
