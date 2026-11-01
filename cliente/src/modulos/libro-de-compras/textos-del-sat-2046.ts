export interface CaminoDelSat2046 {
  clave: string;
  titulo: string;
  ayuda: string;
  pasos: string[];
}

export const VENTANA_DEL_SAT_2046 = {
  titulo: 'Datos para el SAT-2046',
  descripcion: 'Guía para declarar el IVA del pequeño contribuyente, paso a paso.',
  volver: 'Libro de compras',
  recordatorioTitulo: 'Declare cada mes',
  recordatorio:
    'Presente la declaración dentro del mes siguiente, aunque no haya vendido nada: en ese caso se declara en cero.',
  comprasTitulo: 'Sus compras son respaldo',
  compras:
    'Las compras no van en el formulario. Guárdelas en el libro de compras como respaldo de su negocio; el formulario solo lleva lo que vendió.',
  calculoTitulo: 'El cálculo del impuesto',
  calculo:
    'Arrancar calculará el 5 % sobre sus ventas del mes, con las retenciones que le hicieron, cuando esté disponible el módulo de Ventas. Mientras tanto use cualquiera de los dos caminos de abajo.',
  caminos: [
    {
      clave: 'app-fel',
      titulo: 'Camino 1: App FEL (el más fácil)',
      ayuda: 'La SAT ya llena sus ingresos con las facturas que usted emitió.',
      pasos: [
        'Abra la App FEL con su usuario de la SAT.',
        'Busque la «declaración sugerida» (preelaborada) del mes.',
        'Revise que los ingresos sean los que usted facturó.',
        'Si no hay impuesto por pagar, presente la declaración ahí mismo.',
        'Si hay impuesto, genere la boleta de pago SAT-2000 y pague.',
      ],
    },
    {
      clave: 'declaraguate',
      titulo: 'Camino 2: Declaraguate',
      ayuda: 'Úselo si prefiere llenar el formulario usted mismo.',
      pasos: [
        'Entre a Declaraguate y vaya a IVA, «IVA Pequeño Contribuyente SAT-2046».',
        'Escriba su NIT, el período, el total facturado y las constancias de retención que recibió.',
        'Pulse «Validar» para que el sistema revise los datos.',
        'Pulse «Congelar» para dejar la declaración lista.',
        'Si hay impuesto, genere la boleta SAT-2000 y pague.',
      ],
    },
  ] satisfies CaminoDelSat2046[],
  siNoAparece: 'Si el formulario no aparece, búsquelo en la Agencia Virtual, en Declaraciones, o llame al 1550.',
  fuente: 'Pasos tomados de las guías de la SAT; verifique que no hayan cambiado antes de declarar.',
} as const;
