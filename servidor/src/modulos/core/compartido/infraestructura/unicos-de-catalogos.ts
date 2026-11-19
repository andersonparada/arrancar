/** Un valor repetido en una columna única: lo que se le dice al usuario y el campo del formulario que lo causó. */
interface UnicoRepetido {
  mensaje: string;
  campo: string;
}

/** Únicos de Inventarios y de las clases de activos: el mensaje y el campo dicen qué columna choca. */
export const UNICOS_DE_CATALOGOS: Readonly<Record<string, UnicoRepetido>> = {
  articulos_codigo_unico: { mensaje: 'Ya existe un artículo con ese código.', campo: 'codigo' },
  articulos_nombre_unico: { mensaje: 'Ya existe un artículo con ese nombre.', campo: 'nombre' },
  articulos_codigo_de_barras_unico: {
    mensaje: 'Ya existe un artículo con ese código de barras.',
    campo: 'codigoDeBarras',
  },
  bodegas_codigo_unico: { mensaje: 'Ya existe una bodega con ese código.', campo: 'codigo' },
  bodegas_nombre_unico: { mensaje: 'Ya existe una bodega con ese nombre.', campo: 'nombre' },
  categorias_nombre_unico: { mensaje: 'Ya existe una categoría con ese nombre.', campo: 'nombre' },
  unidades_nombre_unico: { mensaje: 'Ya existe una unidad con ese nombre.', campo: 'nombre' },
  unidades_simbolo_unico: { mensaje: 'Ya existe una unidad con ese símbolo.', campo: 'simbolo' },
  lotes_codigo_unico: { mensaje: 'Ya existe un lote con ese código en este artículo.', campo: 'codigo' },
  clases_nombre_unico: { mensaje: 'Ya existe una clase de activo con ese nombre.', campo: 'nombre' },
};

/** Los mensajes por restricción, para sumarlos a los demás. */
export const MENSAJES_DE_UNICOS_DE_CATALOGOS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(UNICOS_DE_CATALOGOS).map(([restriccion, { mensaje }]) => [restriccion, mensaje]),
);

/** Los campos por restricción, para sumarlos a los demás. */
export const CAMPOS_DE_UNICOS_DE_CATALOGOS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(UNICOS_DE_CATALOGOS).map(([restriccion, { campo }]) => [restriccion, campo]),
);
