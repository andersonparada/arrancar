import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { apiTerceros, type DatosTercero, type Tercero, type TipoTercero } from '../servicios/terceros.api';

/** Lo mínimo para registrar a alguien; lo demás se completa en la ficha. */
export interface DatosMinimosDeTercero {
  tipo: TipoTercero;
  nombres: string;
  apellidos: string;
  razonSocial: string;
}

const SIN_COMPLETAR = {
  nombreComercial: null,
  nit: null,
  dpi: null,
  telefono: null,
  whatsapp: null,
  correo: null,
  departamentoCodigo: null,
  municipioCodigo: null,
  direccion: null,
  fotoArchivoId: null,
  notas: null,
  activo: true,
};

function solicitudDe({ tipo, nombres, apellidos, razonSocial }: DatosMinimosDeTercero): DatosTercero {
  const esPersona = tipo === 'individual';
  return {
    ...SIN_COMPLETAR,
    tipo,
    nombres: esPersona ? nombres : null,
    apellidos: esPersona ? apellidos : null,
    razonSocial: esPersona ? null : razonSocial,
  };
}

/** Si el servidor avisa de un posible duplicado, pregunta antes de crearlo igual. */
async function crearConfirmandoDuplicado(solicitud: DatosTercero): Promise<Tercero | undefined> {
  try {
    return await apiTerceros.crear(solicitud);
  } catch (error) {
    const esParecido = error instanceof ErrorApi && error.codigo === 'conflicto';
    if (!esParecido || !window.confirm(`${error.message}\n\n¿Desea crearlo de todas formas?`)) {
      if (esParecido) return undefined;
      throw error;
    }
    return apiTerceros.crear({ ...solicitud, confirmarDuplicado: true });
  }
}

/** Registrar un cliente o proveedor desde cualquier pantalla sin salir de ella. */
export function usarAltaDeTercero() {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  /** @returns el tercero creado, o `undefined` si hubo errores o el usuario desistió. */
  async function crear(datos: DatosMinimosDeTercero): Promise<Tercero | undefined> {
    let tercero: Tercero | undefined;
    const exito = await enviar(async () => (tercero = await crearConfirmandoDuplicado(solicitudDe(datos))));
    if (exito && tercero) avisos.exito('Registrado.');
    return exito ? tercero : undefined;
  }

  return { enviando, errores, crear };
}
