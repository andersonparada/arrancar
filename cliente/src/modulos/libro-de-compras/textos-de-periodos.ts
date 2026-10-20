import type { EventoDeDeclaracion, FormularioDeDeclaracion } from './servicios/periodos.api';

export const VENTANA_DE_PERIODOS = {
  titulo: 'Períodos',
  descripcion: 'Declare cada mes del libro de compras, reábralo si hace falta y vea qué cambió después de declarar.',
  anio: 'Año',
  vacio: 'No hay períodos para mostrar',
  detalle: 'Período',
  ultimaDeclaracion: 'Última declaración',
  sinDeclaraciones: 'Todavía no se ha declarado.',
  abrir: 'Ver el período',
} as const;

export const CONTROL_DE_PERIODOS = {
  titulo: 'Bloqueo de períodos declarados',
  encendido: 'Encendido',
  apagado: 'Apagado',
  explicacionEncendido:
    'Mientras un período esté declarado no se pueden registrar, anular ni eliminar facturas de ese mes, ni cambiar el régimen fiscal de la empresa que lo cubra. Para cambiarlo hay que reabrir el período, con su motivo, y luego declarar de nuevo.',
  explicacionApagado:
    'Apagado, el sistema deja registrar, anular y eliminar en períodos ya declarados y solo avisa que habrá que rectificar. Encienda el bloqueo para proteger lo que ya presentó a la SAT.',
  noBloquea:
    'No bloquea: anotar constancias de retención, marcar enteros, resolver retenciones por resolver, ni los datos de proveedores y conceptos.',
  encender: 'Encender el bloqueo',
  apagar: 'Apagar el bloqueo',
  confirmarEncender: {
    titulo: 'Encender el bloqueo',
    mensaje:
      'Desde ahora no se podrá registrar, anular ni eliminar facturas en los períodos declarados. Los períodos que declare después también quedarán bloqueados.',
    textoConfirmar: 'Encender el bloqueo',
  },
  apagarTitulo: 'Apagar el bloqueo de períodos declarados',
  apagarAyuda: 'Diga por qué apaga el bloqueo (por ejemplo, «registrar facturas olvidadas y luego rectificar»).',
  apagarResumen: [
    'Se podrá registrar, anular y eliminar facturas en períodos declarados.',
    'El libro de un período declarado puede cambiar: tendrá que rectificar la declaración.',
    'Queda registrado quién lo apagó y por qué.',
  ],
  avisoApagado: 'Bloqueo apagado.',
  avisoEncendido: 'Bloqueo encendido.',
  actualizadoPor: 'Cambiado',
} as const;

export const ESTADOS_DE_PERIODO = {
  declarado: 'Declarado',
  abierto: 'Abierto',
  sin_terminar: 'Sin terminar',
} as const;

export const EVENTOS_DE_PERIODO: Record<EventoDeDeclaracion, string> = {
  declaracion: 'Declaración',
  rectificacion: 'Rectificación',
  reapertura: 'Reapertura',
};

export const FORMULARIOS: Record<FormularioDeDeclaracion, string> = {
  'SAT-2237': 'SAT-2237 (IVA general)',
  'SAT-2046': 'SAT-2046 (pequeño contribuyente)',
  sin_formulario: 'Sin formulario',
};

export const DETALLE_DE_PERIODO = {
  historial: 'Historial',
  historialVacio: 'Este período no se ha declarado ni reabierto.',
  cambios: 'Cambios desde la declaración',
  cambiosAyuda: 'Lo que cambió en el libro después de la última declaración. Es lo que se corrige al rectificar.',
  sinCambios: 'El libro es igual a lo declarado. No hay nada que rectificar.',
  cambioDeHuella:
    'El libro cambió, pero no hay facturas registradas ni anuladas que lo expliquen: una factura se eliminó o se corrigió un monto. Revise la auditoría.',
  documentos: 'Facturas registradas o anuladas después de declarar',
  revision: 'Antes de declarar, revise',
  sinRevision: 'No hay nada pendiente de revisar.',
  declarar: 'Declarar',
  rectificar: 'Declarar de nuevo (rectificación)',
  reabrir: 'Reabrir',
  verLibro: 'Ver el libro del período',
  volver: 'Períodos',
} as const;

export const VENTANA_DE_DECLARACION = {
  titulo: 'Declarar el período',
  tituloRectificacion: 'Rectificar la declaración',
  formulario: 'Formulario',
  formularioAuto: 'El que corresponde al régimen',
  numero: 'Número del formulario (opcional)',
  numeroAyuda: 'Letras y números, sin espacios. Puede anotarlo después declarando de nuevo.',
  fecha: 'Fecha de presentación (opcional)',
  fechaAyuda: 'No puede ser anterior al mes siguiente al período.',
  boton: 'Declarar',
  botonRectificacion: 'Registrar rectificación',
  exito: 'Período declarado.',
  exitoRectificacion: 'Rectificación registrada.',
} as const;

export const VENTANA_DE_REAPERTURA = {
  titulo: 'Reabrir el período',
  ayuda: 'Diga por qué lo reabre (por ejemplo, «falta registrar una factura de proveedor»).',
  boton: 'Reabrir',
  exito: 'Período reabierto.',
} as const;

/** El error `periodo_declarado` del formulario de registro. */
export const PERIODO_BLOQUEADO = {
  usar: (mes: string) => `Usar ${mes}`,
  sinPropuesta:
    'Una nota de crédito va en el mes en que se recibe. Reabra ese período para registrarla (luego tendrá que rectificar).',
  fueraDePlazo:
    'Ese mes ya pasó del plazo del crédito fiscal (art. 20): el IVA irá al costo o gasto. También puede reabrir el período declarado y rectificar.',
  irAPeriodos: 'Ir a Períodos para reabrirlo',
} as const;
