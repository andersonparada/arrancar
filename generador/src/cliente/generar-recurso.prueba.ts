import { describe, expect, it } from 'vitest';
import { entero, fecha, lista, siNo, telefono, texto } from '../definicion/campos.js';
import type { EntradaDeRecurso } from '../definicion/definir-recurso.js';
import { CLIENTE, generarEnMemoria } from '../pruebas/modulo-de-prueba.js';

const vaca: EntradaDeRecurso = {
  modulo: 'ganado',
  entidad: 'Vaca',
  plural: 'Vacas',
  genero: 'femenino',
  alcance: 'empresa',
  pantalla: 'catalogo',
  icono: 'Beef',
  campos: {
    nombre: texto({ requerido: true }),
    raza: lista({ brahman: 'Brahman', criolla: 'Criolla' }, { requerido: true }),
    nacimiento: fecha(),
    partos: entero(),
    prenada: siNo({ etiqueta: 'Preñada' }),
    telefonoDelVaquero: telefono(),
  },
};

async function generar(entrada: EntradaDeRecurso = vaca) {
  const disco = await generarEnMemoria(entrada, 'ganado/vaca');
  return { disco, leer: (archivo: string) => disco.leer(`${CLIENTE}/${archivo}`) };
}

describe('generar un recurso en el cliente', () => {
  it('escribe el servicio, la edición con su prueba, la ventana y la página', async () => {
    const { disco } = await generar();

    expect([...disco.archivos.keys()]).toEqual(
      expect.arrayContaining([
        `${CLIENTE}/servicios/vacas.api.ts`,
        `${CLIENTE}/composables/vacas/edicion-de-vaca.ts`,
        `${CLIENTE}/composables/vacas/edicion-de-vaca.prueba.ts`,
        `${CLIENTE}/composables/vacas/usar-eliminacion-de-vaca.ts`,
        `${CLIENTE}/componentes/vacas/VentanaDeVaca.vue`,
        `${CLIENTE}/paginas/ListaDeVacas.vue`,
      ]),
    );
  });

  it('cada tipo de campo tiene su control y su forma de mostrarse', async () => {
    const { leer } = await generar();
    const ventana = leer('componentes/vacas/VentanaDeVaca.vue');
    const detalles = leer('composables/vacas/detalles-de-vaca.ts');

    expect(ventana).toContain('<CampoTexto v-model="edicion.nacimiento" etiqueta="Nacimiento" tipo="date"');
    expect(ventana).toContain('<CampoInterruptor v-model="edicion.prenada" etiqueta="Preñada" />');
    expect(ventana).toContain(':opciones="opcionesDeLista(OPCIONES_DE_RAZA, false)"');
    expect(detalles).toContain('formatearTexto(formatearTelefono(registro.telefonoDelVaquero))');
    expect(leer('composables/vacas/edicion-de-vaca.ts')).toContain('partos: numeroONulo(edicion.partos),');
  });

  it('los textos concuerdan con el género del recurso', async () => {
    const { leer } = await generar();

    expect(leer('textos.ts')).toContain("nuevo: 'Nueva vaca',");
    expect(leer('composables/vacas/usar-vacas.ts')).toContain("'Vaca registrada.'");
  });

  it('agrega su ruta y su opción del menú sin repetir el ícono del módulo', async () => {
    const { leer } = await generar();
    const modulo = leer('modulo.ts');

    expect(modulo.match(/import \{ Beef \}/g)).toHaveLength(1);
    expect(modulo).toContain("path: '/ganado/vacas',");
    expect(modulo).toContain("seccion: 'administracion', permiso: 'ganado.vacas.ver'");
  });

  it('con baja por inactivación muestra la insignia y no elimina', async () => {
    const { disco, leer } = await generar({ ...vaca, baja: 'inactivar' });

    expect(leer('paginas/ListaDeVacas.vue')).toContain(':inactivo="!registro.activo"');
    expect(disco.existe(`${CLIENTE}/composables/vacas/usar-eliminacion-de-vaca.ts`)).toBe(false);
  });
});
