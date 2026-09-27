import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../compartido/aplicacion/errores.js';
import {
  AlmacenamientoEnMemoria,
  operadorDePrueba,
  UnidadDeTrabajoEnMemoria,
} from '../../../compartido/pruebas/dobles-compartidos.js';
import { FormatoDeImagenNoAceptado } from '../../dominio/imagen.js';
import { OptimizadorFalso, RepositorioArchivosEnMemoria } from '../../pruebas/dobles-de-archivos.js';
import { AbrirImagen } from './abrir-imagen.js';
import { SubirImagen } from './subir-imagen.js';

const operador = operadorDePrueba();
const foto = { contenido: Buffer.from('foto'), nombreOriginal: 'vaca.jpg', tipoMime: 'image/jpeg' };

let almacenamiento: AlmacenamientoEnMemoria;
let repositorio: RepositorioArchivosEnMemoria;
let unidadDeTrabajo: UnidadDeTrabajoEnMemoria;
let subir: SubirImagen;
let abrir: AbrirImagen;

beforeEach(() => {
  almacenamiento = new AlmacenamientoEnMemoria();
  repositorio = new RepositorioArchivosEnMemoria();
  unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  subir = new SubirImagen({ unidadDeTrabajo, repositorio, almacenamiento, optimizador: new OptimizadorFalso() });
  abrir = new AbrirImagen({ unidadDeTrabajo, repositorio, almacenamiento });
});

describe('subir una imagen', () => {
  it('guarda el tamaño normal y la miniatura en la carpeta de la empresa', async () => {
    const archivo = await subir.ejecutar(operador, foto);

    expect(archivo).toMatchObject({ ancho: 1600, alto: 800 });
    const rutas = [...almacenamiento.contenidos.keys()];
    expect(rutas).toHaveLength(2);
    expect(rutas.every((ruta) => ruta.startsWith(`${operador.empresaId}/`))).toBe(true);
    expect(rutas.some((ruta) => ruta.endsWith('_min.webp'))).toBe(true);
  });

  it('la registra a nombre de quien la sube, dentro de su empresa', async () => {
    await subir.ejecutar(operador, foto);

    expect(repositorio.guardados[0]).toMatchObject({
      empresaId: operador.empresaId,
      subidoPor: operador.usuarioId,
      tipoMime: 'image/webp',
      nombreOriginal: 'vaca.jpg',
    });
    expect(unidadDeTrabajo.contextos).toEqual([operador]);
  });

  it('rechaza lo que no es una imagen sin guardar nada', async () => {
    const texto = { ...foto, tipoMime: 'text/plain' };

    await expect(subir.ejecutar(operador, texto)).rejects.toThrow(FormatoDeImagenNoAceptado);
    expect(almacenamiento.contenidos.size).toBe(0);
  });
});

describe('abrir una imagen', () => {
  it('entrega la variante pedida', async () => {
    const { id } = await subir.ejecutar(operador, foto);

    const imagen = await abrir.ejecutar(operador, { archivoId: id, variante: 'miniatura' });

    expect(imagen.tipoMime).toBe('image/webp');
    expect(Buffer.concat(await imagen.contenido.toArray()).toString()).toBe('imagen de 400');
  });

  it('responde que no existe si falta el registro o el contenido', async () => {
    const { id } = await subir.ejecutar(operador, foto);
    almacenamiento.contenidos.clear();

    await expect(abrir.ejecutar(operador, { archivoId: id, variante: 'original' })).rejects.toThrow(
      RecursoNoEncontrado,
    );
    await expect(abrir.ejecutar(operador, { archivoId: crypto.randomUUID(), variante: 'original' })).rejects.toThrow(
      RecursoNoEncontrado,
    );
  });
});
