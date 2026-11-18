import type { SeccionesAportadas } from './secciones.contratos.js';

/**
 * Órdenes y avisos que da el módulo `empresas` para los demás módulos (ver `mediador.contratos.ts`).
 * Corren dentro de la transacción de quien pregunta, con la empresa de su operador.
 */
/** Un problema que un módulo encontró al revisar la carga inicial antes de cerrarla. */
export interface HallazgoDeCierre {
  /** Código propio del módulo: `no_cuadra`. */
  codigo: string;
  /** `pide_motivo` exige que quien cierra escriba un motivo; `aviso` solo informa. */
  nivel: 'pide_motivo' | 'aviso';
  /** Texto final, ya armado por el módulo. */
  mensaje: string;
  registro: { id: string; nombre: string } | null;
}

/** Una cifra del cuadre de un módulo, tal como se guarda y se exporta con el cierre. */
export interface CifraDelCuadre {
  /** Clave propia del módulo: `total_bancos`. */
  clave: string;
  /** «Saldo en libros al corte». */
  etiqueta: string;
  tipo: 'monto' | 'cantidad';
  /** Monto con dos decimales y signo (`-120.00`) o cantidad entera (`14`). */
  valor: string;
  /** `null` = total del módulo. */
  registro: { id: string; nombre: string } | null;
}

/** Máximo de cifras que un módulo puede dar en su revisión: son el resumen numérico, no el detalle. */
export const MAXIMO_DE_CIFRAS_POR_MODULO = 200;

/** Lo que un módulo dice de la carga inicial antes de cerrarla. */
export interface RevisionDeCierreDeModulo {
  nombreDelModulo: string;
  /** «4 cuentas con saldo inicial al 31/12/2026». */
  resumen: string | null;
  /** Pantalla donde se corrige: `/bancos/saldos-iniciales`. */
  ruta: string | null;
  hallazgos: HallazgoDeCierre[];
  cifras: CifraDelCuadre[];
}

declare module './mediador.contratos.js' {
  interface PreguntasEntreModulos {
    /**
     * Antes de cerrar la carga inicial, cada módulo activo con saldos iniciales dice qué encontró y con qué cifras
     * (`null` = no tiene nada que decir). El operador lleva `empresaId` = la empresa de la carga.
     */
    'empresas.revisar_cierre_de_carga': {
      datos: { empresaId: string; fechaDeInicio: string };
      respuesta: RevisionDeCierreDeModulo | null;
    };
  }
  interface OrdenesEntreModulos {
    /** La fecha de inicio de la empresa y si su carga inicial ya se cerró (`null` si aún no tiene fecha). */
    'empresas.obtener_carga_inicial': {
      datos: { empresaId: string };
      respuesta: { fechaDeInicio: string | null; cerrada: boolean };
    };
    /** Los datos de identificación de la empresa: los de `core.empresas` y los fiscales. */
    'empresas.obtener_datos_de_empresa': {
      datos: { empresaId: string };
      respuesta: {
        nombre: string;
        nit: string | null;
        razonSocial: string | null;
        nombreComercial: string | null;
      };
    };
  }
  interface AvisosEntreModulos {
    /**
     * Se guardó una empresa (nueva o editada). Cada módulo activo guarda su sección de `secciones`, si trae la
     * suya. El operador del aviso lleva `empresaId` = la empresa guardada, aunque no sea la activa.
     */
    'empresas.empresa_guardada': { empresaId: string; secciones: SeccionesAportadas };
    /**
     * La fecha de inicio de una empresa con carga abierta va a cambiar (`fechaDeInicio` es la nueva). Cada módulo con
     * saldos iniciales (Cuentas por pagar, Bancos…) lanza su error si algún saldo suyo quedaría con emisión o fecha
     * igual o posterior a la nueva; el error deshace el cambio. El operador lleva `empresaId` = la empresa.
     */
    'empresas.fecha_de_inicio_por_cambiar': { empresaId: string; fechaDeInicio: string };
  }
}

export {};
