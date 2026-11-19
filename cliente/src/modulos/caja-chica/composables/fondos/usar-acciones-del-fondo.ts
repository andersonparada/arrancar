import { computed, type Ref, type UnwrapNestedRefs } from 'vue';
import { useRouter } from 'vue-router';
import { apiFondos } from '../../servicios/fondos.api';
import type { Fondo } from '../../servicios/tipos-de-fondos';
import { edicionDeMotivo, faltaElMotivo } from '../edicion-de-motivo';
import { usarVentanaDeAccion } from '../usar-ventana-de-accion';
import {
  cambiaElTope,
  cuerpoDeEdicionDelFondo,
  edicionDeDatosDelFondo,
  faltaDelFondo,
} from './edicion-de-datos-del-fondo';
import {
  cuerpoDeAnulacionDeApertura,
  cuerpoDeAumento,
  cuerpoDeCustodio,
  cuerpoDeDisminucion,
  edicionDeCustodio,
  edicionDeDisminucion,
  edicionDeEntrega,
} from './edicion-de-fondo';
import { usarCatalogosDelFondo } from './usar-catalogos-del-fondo';

interface Contexto {
  fondo: Ref<Fondo | null>;
  recargar: () => Promise<unknown>;
  alAbrir: () => Promise<void>;
}

const idDe = ({ fondo }: Contexto): string => fondo.value?.id ?? '';

/** Mover el dinero del fondo: aumentar (el banco entrega más) y disminuir (el custodio deposita). */
function ventanasDeDinero(contexto: Contexto) {
  const { fondo, recargar, alAbrir } = contexto;
  const aumentar = usarVentanaDeAccion({
    inicial: edicionDeEntrega,
    alAbrir,
    enviar: (edicion) => apiFondos.aumentar(idDe(contexto), cuerpoDeAumento(edicion, fondo.value?.custodio ?? null)),
    exito: 'Fondo aumentado.',
    alTerminar: recargar,
  });
  const disminuir = usarVentanaDeAccion({
    inicial: () => edicionDeDisminucion(fondo.value?.cuentaBancariaId ?? null),
    alAbrir,
    enviar: (edicion) => apiFondos.disminuir(idDe(contexto), cuerpoDeDisminucion(edicion)),
    exito: 'Fondo disminuido.',
    alTerminar: recargar,
  });
  return { aumentar, disminuir };
}

/** Corregir el nombre, la localidad, el tope y la cuenta; si el tope cambia, la ventana pide el motivo. */
function ventanaDeEdicion(contexto: Contexto) {
  const { fondo } = contexto;
  const edicion = usarVentanaDeAccion({
    inicial: () => edicionDeDatosDelFondo(fondo.value),
    validar: faltaDelFondo,
    alAbrir: contexto.alAbrir,
    enviar: (datos) => apiFondos.editar(idDe(contexto), cuerpoDeEdicionDelFondo(datos, fondo.value)),
    exito: 'Fondo actualizado.',
    alTerminar: contexto.recargar,
  });
  return { edicion, cambiaElTope: computed(() => cambiaElTope(edicion.edicion.value, fondo.value)) };
}

/** Cambiar el custodio y anular la apertura (esta lleva de vuelta a la lista: el fondo ya no se usa). */
function ventanasDeCambio(contexto: Contexto) {
  const router = useRouter();
  const custodio = usarVentanaDeAccion({
    inicial: edicionDeCustodio,
    alAbrir: contexto.alAbrir,
    enviar: (edicion) => apiFondos.cambiarCustodio(idDe(contexto), cuerpoDeCustodio(edicion)),
    exito: 'Custodio cambiado.',
    alTerminar: contexto.recargar,
  });
  const anulacion = usarVentanaDeAccion({
    inicial: edicionDeMotivo,
    validar: faltaElMotivo,
    enviar: ({ motivo, fecha }) => apiFondos.anularApertura(idDe(contexto), cuerpoDeAnulacionDeApertura(motivo, fecha)),
    exito: 'Apertura anulada.',
    alTerminar: () => void router.push({ name: 'caja-chica.fondos' }),
  });
  return { custodio, anulacion };
}

/** Lo que se puede hacer con un fondo abierto desde su ficha; cada acción es una ventana. */
export function usarAccionesDelFondo(fondo: Ref<Fondo | null>, recargar: () => Promise<unknown>) {
  const catalogos = usarCatalogosDelFondo();
  const contexto = { fondo, recargar, alAbrir: catalogos.cargar };
  return {
    catalogos,
    ...ventanaDeEdicion(contexto),
    ...ventanasDeDinero(contexto),
    ...ventanasDeCambio(contexto),
    abierto: computed(() => fondo.value?.estado === 'abierto'),
  };
}

/** Lo que devuelve `usarAccionesDelFondo` envuelto en `reactive`, como lo recibe la ventana. */
export type AccionesDelFondoEnVista = UnwrapNestedRefs<ReturnType<typeof usarAccionesDelFondo>>;
