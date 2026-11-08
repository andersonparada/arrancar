import type { EstadoDeDte } from './servicios/dte-recibidos.api';

/** Textos de la pantalla «DTE de la SAT»: la bandeja de documentos que la SAT dice que la empresa recibió. */
export const VENTANA_DE_LA_SAT = {
  titulo: 'DTE de la SAT',
  descripcion:
    'Los documentos que la SAT dice que la empresa recibió, para registrarlos de una vez. Es opcional: puede seguir registrando sus facturas a mano.',
  registrarAMano: 'Registrar una factura a mano',
} as const;

export interface PestanaDeLaBandeja {
  clave: EstadoDeDte;
  texto: string;
  /** Qué se ve en esta pestaña, para el que llega sin saberlo. */
  explicacion: string;
}

/** Las pestañas por estado de la fila, en el orden en que se trabajan. */
export const PESTANAS_DE_LA_BANDEJA: PestanaDeLaBandeja[] = [
  {
    clave: 'pendiente',
    texto: 'Pendientes',
    explicacion: 'Faltan por registrar. Marque las que quiera, complete lo que falte y confírmelas todas a la vez.',
  },
  { clave: 'registrado', texto: 'Registrados', explicacion: 'Ya están en el libro de compras.' },
  {
    clave: 'descartado',
    texto: 'Descartados',
    explicacion: 'Los que decidió no registrar. Puede restaurarlos si fue un error.',
  },
  {
    clave: 'bloqueado',
    texto: 'Bloqueados',
    explicacion:
      'Ya están registrados en otra empresa de su cuenta. Se liberan solos si esa empresa anula su registro; también puede descartarlos.',
  },
];

export const VACIO_DE_LA_BANDEJA = {
  titulo: 'Todavía no hay DTE de la SAT',
  descripcion:
    'Aquí aparecerán los documentos que se carguen desde el archivo de la SAT. Si registra sus facturas a mano, no necesita esta pantalla.',
} as const;

export const VACIO_POR_PESTANA: Record<EstadoDeDte, string> = {
  pendiente: 'No hay DTE pendientes con estos filtros.',
  registrado: 'Todavía no se ha registrado ningún DTE desde esta pantalla.',
  descartado: 'No hay DTE descartados.',
  bloqueado: 'No hay DTE bloqueados.',
};

/** El motivo de un bloqueo, en palabras del usuario. */
export const MOTIVOS_DE_BLOQUEO: Record<string, string> = {
  registrado_en_otra_empresa: 'Ya está registrado en otra empresa de su cuenta.',
};

/** Lo que falta en una fila para poder confirmarla. */
export const FALTANTES = {
  concepto: 'el concepto de gasto',
  destino: 'el destino',
  recepcion: 'la fecha de recepción',
  factura: 'la factura que corrige',
} as const;

/** La pestaña que no es un estado de la fila: la comparación de un mes contra la SAT. */
export const PESTANA_DE_CONCILIACION = 'conciliacion';
export type ClaveDePestana = EstadoDeDte | typeof PESTANA_DE_CONCILIACION;

export const IMPORTAR_DE_LA_SAT = {
  boton: 'Importar de la SAT',
  cargarArchivo: 'Cargar el archivo de la SAT',
  ayuda:
    'Cargar el archivo es opcional: sirve para registrar varias facturas de una vez y comparar el mes con la SAT. Puede registrar sus facturas a mano cuando prefiera.',
  titulo: 'Cargar el archivo de la SAT',
  instrucciones:
    'Baje de la Agencia Virtual de la SAT la consulta de «DTE recibidos» del mes y súbala tal como la entrega la SAT (.xls), o en .xlsx o CSV. Cargarla no registra nada: solo llena la lista de pendientes, y puede subir el mismo archivo otra vez.',
  archivo: 'Archivo de la SAT',
  extensionNoAdmitida: 'Elija un archivo .xls, .xlsx o .csv.',
  cargando: 'Cargando y revisando el archivo…',
  cargar: 'Cargar',
  listo: 'Listo',
  cancelar: 'Cancelar',
  rechazadas: 'Filas que no entraron',
  masRechazadas: 'Se muestran las primeras; el lote guardó el resto en su resumen.',
  avisos: 'Avisos',
} as const;

export const TEXTOS_DE_LAS_ACCIONES = {
  completar: 'Completar',
  confirmar: 'Confirmar',
  abrirEnElFormulario: 'Abrir en el formulario',
  descartar: 'Descartar',
  restaurar: 'Restaurar',
  marcarTodas: 'Marcar todas las de esta página',
  quitarMarcas: 'Quitar marcas',
  verFactura: 'Ver factura',
} as const;
