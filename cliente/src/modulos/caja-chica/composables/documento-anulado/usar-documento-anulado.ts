import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiComprobantes } from '../../servicios/comprobantes.api';
import type { Comprobante, ComprobanteDeLaBandeja } from '../../servicios/tipos-de-comprobantes';
import { edicionDeMotivo, faltaElMotivo } from '../edicion-de-motivo';
import { usarVentanaDeAccion } from '../usar-ventana-de-accion';
import { candidatosDeReemplazo } from './documento-anulado';
import {
  cuerpoDeDisputa,
  cuerpoDeSalida,
  edicionDeDisputa,
  edicionDeSalida,
  faltaDeDisputa,
  faltaDeSalida,
  type EdicionDeSalida,
} from './edicion-de-salida';

/** Reemplazar con la FEL nueva o resolver con devolución, cobro o sin recuperación: dos rutas, una ventana. */
function enviarLaSalida(comprobante: Comprobante, edicion: EdicionDeSalida): Promise<Comprobante> {
  return edicion.salida === 'reemplazo'
    ? apiComprobantes.reemplazarDocumentoAnulado(comprobante.id, {
        reemplazoId: edicion.reemplazoId ?? '',
        motivo: edicion.motivo.trim(),
      })
    : apiComprobantes.resolverDocumentoAnulado(comprobante.id, cuerpoDeSalida(edicion));
}

/** Las facturas de la bandeja que podrían reemplazar a la anulada. */
function usarCandidatos(objetivo: () => Comprobante | null) {
  const avisos = usarAvisos();
  const candidatos = ref<ComprobanteDeLaBandeja[]>([]);
  const cargando = ref(false);

  async function cargar(): Promise<void> {
    const anulado = objetivo();
    candidatos.value = [];
    if (!anulado?.proveedorId) return;
    cargando.value = true;
    try {
      const bandeja = await apiComprobantes.bandeja({ proveedorId: anulado.proveedorId });
      candidatos.value = candidatosDeReemplazo(anulado, bandeja);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la bandeja.');
    } finally {
      cargando.value = false;
    }
  }

  return { candidatos, cargando, cargar };
}

type Objetivo = Ref<Comprobante | null>;
type AlTerminar = () => Promise<unknown>;

/** Resolver con reemplazo, devolución, cobro o sin recuperación. */
function usarVentanaDeSalida(
  objetivo: Objetivo,
  reemplazos: ReturnType<typeof usarCandidatos>,
  alTerminar: AlTerminar,
) {
  return usarVentanaDeAccion({
    inicial: () => edicionDeSalida(objetivo.value),
    validar: (edicion) => (objetivo.value ? faltaDeSalida(edicion, objetivo.value) : {}),
    alAbrir: reemplazos.cargar,
    enviar: (edicion) =>
      objetivo.value ? enviarLaSalida(objetivo.value, edicion) : Promise.reject(new Error('No hay un comprobante.')),
    exito: 'Documento anulado resuelto.',
    alTerminar,
  });
}

/** Poner en disputa (motivo y prueba de pago) y sacar de la disputa (motivo). */
function usarVentanasDeDisputa(objetivo: Objetivo, alTerminar: AlTerminar) {
  const disputa = usarVentanaDeAccion({
    inicial: edicionDeDisputa,
    validar: faltaDeDisputa,
    enviar: (edicion) => apiComprobantes.ponerEnDisputa(objetivo.value?.id ?? '', cuerpoDeDisputa(edicion)),
    exito: 'Documento puesto en disputa. No se toma el crédito mientras no se aclare.',
    alTerminar,
  });
  const retiro = usarVentanaDeAccion({
    inicial: edicionDeMotivo,
    validar: faltaElMotivo,
    enviar: ({ motivo }) => apiComprobantes.retirarDeLaDisputa(objetivo.value?.id ?? '', motivo.trim()),
    exito: 'El documento volvió a «por resolver».',
    alTerminar,
  });
  return { disputa, retiro };
}

/**
 * Lo que se hace con un documento que su emisor anuló después de gastar: resolverlo (reemplazo, devolución, cobro o sin
 * recuperación), llevarlo a disputa y sacarlo de ella. Ninguna de estas acciones mueve el efectivo del fondo.
 */
export function usarDocumentoAnulado(alTerminar: AlTerminar) {
  const objetivo = ref<Comprobante | null>(null);
  const reemplazos = usarCandidatos(() => objetivo.value);
  const salida = usarVentanaDeSalida(objetivo, reemplazos, alTerminar);
  const { disputa, retiro } = usarVentanasDeDisputa(objetivo, alTerminar);
  const pedir = (comprobante: Comprobante, ventana: { abrir: () => Promise<void> }): void => {
    objetivo.value = comprobante;
    void ventana.abrir();
  };

  return {
    objetivo,
    reemplazos,
    salida,
    disputa,
    retiro,
    resolver: (comprobante: Comprobante) => pedir(comprobante, salida),
    ponerEnDisputa: (comprobante: Comprobante) => pedir(comprobante, disputa),
    retirarDeLaDisputa: (comprobante: Comprobante) => pedir(comprobante, retiro),
  };
}
