import type { ClienteApi } from './soporte/cliente-api.js';

/** Lo que un artículo necesita elegir, ya registrado en la cuenta del usuario. */
export interface ReferenciasDeArticulo {
  categoriaId: string;
  unidadBaseId: string;
  unidadDeCajaId: string;
  conceptoDeGastoId: string;
}

/** Categoría, unidades sembradas (Libra y Caja) y concepto de gasto de la cuenta de `usuario`. */
export async function crearReferencias(usuario: ClienteApi): Promise<ReferenciasDeArticulo> {
  const categoria = await usuario.post('/api/inventarios/categorias', {
    nombre: 'Alimentos',
    tipoDeInventarioPorOmision: 'mercaderia',
    activo: true,
  });
  const unidades = (await usuario.get('/api/inventarios/unidades')).cuerpo as { id: string; nombre: string }[];
  const concepto = await usuario.post('/api/libro-de-compras/conceptos-de-gasto', {
    nombre: 'Alimento para animales',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  });
  return {
    categoriaId: categoria.cuerpo.id,
    unidadBaseId: unidades.find((unidad) => unidad.nombre === 'Libra')!.id,
    unidadDeCajaId: unidades.find((unidad) => unidad.nombre === 'Caja')!.id,
    conceptoDeGastoId: concepto.cuerpo.id,
  };
}

let contador = 0;

/** Un artículo válido; cada llamada da un código y un nombre distintos, porque no se pueden repetir en la empresa. */
export const datosDeArticulo = (referencias: ReferenciasDeArticulo, cambios: Record<string, unknown> = {}) => ({
  codigo: `ART-${++contador}`,
  nombre: `Artículo ${contador}`,
  descripcion: 'Una nota de prueba.',
  tipoDeInventario: 'mercaderia',
  manejaLotes: false,
  manejaVencimiento: false,
  codigoDeBarras: null,
  existenciaMinima: '12.5000',
  pesoKgPorUnidadBase: null,
  activo: true,
  categoriaId: referencias.categoriaId,
  unidadBaseId: referencias.unidadBaseId,
  conceptoDeGastoId: referencias.conceptoDeGastoId,
  ...cambios,
});
