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
  seccion: 'administracion',
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
    const campos = leer('componentes/vacas/CamposDeVaca.vue');
    const detalles = leer('composables/vacas/detalles-de-vaca.ts');

    expect(campos).toContain('<CampoTexto v-model="edicion.nacimiento" etiqueta="Nacimiento" tipo="date"');
    expect(campos).toContain('<CampoInterruptor v-model="edicion.prenada" etiqueta="Preñada" />');
    expect(campos).toContain(':opciones="opcionesDeLista(OPCIONES_DE_RAZA, false)"');
    expect(leer('componentes/vacas/VentanaDeVaca.vue')).toContain('<CamposDeVaca v-model="edicion"');
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

  it('la opción del menú va en la sección que dice la definición', async () => {
    const { leer } = await generar({ ...vaca, seccion: 'operacion' });

    expect(leer('modulo.ts')).toContain("seccion: 'operacion', permiso: 'ganado.vacas.ver'");
  });

  it('con baja por inactivación muestra la insignia y no elimina', async () => {
    const { disco, leer } = await generar({ ...vaca, baja: 'inactivar' });

    expect(leer('paginas/ListaDeVacas.vue')).toContain(':inactivo="!registro.activo"');
    expect(disco.existe(`${CLIENTE}/composables/vacas/usar-eliminacion-de-vaca.ts`)).toBe(false);
  });
});

describe('Excel según la sección del menú', () => {
  it('administración importa y exporta: botones, ventana y el getter de la API', async () => {
    const { leer } = await generar(vaca);

    const api = leer('servicios/vacas.api.ts');
    expect(api).toContain("import { intercambioDe } from '@/modulos/core/servicios/intercambio';");
    expect(api).toContain('get intercambio()');

    const usar = leer('composables/vacas/usar-vacas.ts');
    expect(usar).toContain('usarIntercambio(apiVacas.intercambio, cargar)');
    expect(usar).toContain('intercambio,');

    const pagina = leer('paginas/ListaDeVacas.vue');
    expect(pagina).toContain("importar: 'ganado.vacas.importar', exportar: 'ganado.vacas.exportar'");
    expect(pagina).toContain('<AccionesDeIntercambio');
    expect(pagina).toContain('@importar="intercambio.abrir"');
    expect(pagina).toContain('<VentanaDeImportacion');
  });

  it('operación no genera nada de Excel: ni el getter, ni el composable, ni los botones', async () => {
    const { disco, leer } = await generar({ ...vaca, seccion: 'operacion' });

    const api = leer('servicios/vacas.api.ts');
    expect(api).not.toContain('intercambioDe');
    expect(api).not.toContain('intercambio');

    const usar = leer('composables/vacas/usar-vacas.ts');
    expect(usar).not.toContain('usarIntercambio');
    expect(usar).not.toContain('intercambio');

    const pagina = leer('paginas/ListaDeVacas.vue');
    expect(pagina).not.toContain('AccionesDeIntercambio');
    expect(pagina).not.toContain('VentanaDeImportacion');
    expect(pagina).not.toContain('PERMISOS_DE_INTERCAMBIO');
    expect(disco.existe(`${CLIENTE}/paginas/ListaDeVacas.vue`)).toBe(true);
  });

  it('reportes solo exporta: sin botón ni ventana de importar', async () => {
    const { leer } = await generar({ ...vaca, seccion: 'reportes' });

    const api = leer('servicios/vacas.api.ts');
    expect(api).toContain('get intercambio()');

    const pagina = leer('paginas/ListaDeVacas.vue');
    expect(pagina).toContain("PERMISOS_DE_INTERCAMBIO = { exportar: 'ganado.vacas.exportar' }");
    expect(pagina).toContain('<AccionesDeIntercambio');
    expect(pagina).not.toContain('@importar="intercambio.abrir"');
    expect(pagina).not.toContain('<VentanaDeImportacion');
  });
});

describe('pantalla completa', () => {
  const completa = { ...vaca, pantalla: 'completa' } as const;

  it('escribe la lista, el formulario en página y la ficha, sin ventana', async () => {
    const { disco } = await generar(completa);

    expect([...disco.archivos.keys()]).toEqual(
      expect.arrayContaining([
        `${CLIENTE}/paginas/ListaDeVacas.vue`,
        `${CLIENTE}/paginas/FormularioDeVaca.vue`,
        `${CLIENTE}/paginas/FichaDeVaca.vue`,
        `${CLIENTE}/composables/vacas/usar-formulario-de-vaca.ts`,
        `${CLIENTE}/componentes/vacas/CamposDeVaca.vue`,
      ]),
    );
    expect(disco.existe(`${CLIENTE}/componentes/vacas/VentanaDeVaca.vue`)).toBe(false);
  });

  it('registra las cuatro rutas; la ficha y la edición reciben el id', async () => {
    const modulo = (await generar(completa)).leer('modulo.ts');

    expect(modulo).toContain("name: 'ganado.vacas.nuevo',");
    expect(modulo).toContain("path: '/ganado/vacas/:vacaId',");
    expect(modulo).toMatch(/import\('\.\/paginas\/FormularioDeVaca\.vue'\),\s+props: true,/);
    expect(modulo).toContain('titulo: VENTANAS_GANADO.vacas.editar },');
  });

  it('la tarjeta lleva a la ficha, y la ficha elimina y vuelve a la lista', async () => {
    const { leer } = await generar(completa);

    expect(leer('paginas/ListaDeVacas.vue')).toContain(
      ':destino="{ name: \'ganado.vacas.ficha\', params: { vacaId: registro.id } }"',
    );
    expect(leer('paginas/FichaDeVaca.vue')).toContain('@click="eliminar(registro)"');
    expect(leer('composables/vacas/usar-ficha-de-vaca.ts')).toContain("await router.push({ name: 'ganado.vacas' });");
  });

  it('con baja por inactivación la ficha muestra la insignia y no elimina', async () => {
    const ficha = (await generar({ ...completa, baja: 'inactivar' })).leer('paginas/FichaDeVaca.vue');

    expect(ficha).toContain('<InsigniaBase v-if="!registro.activo" tono="rojo">Inactivo</InsigniaBase>');
    expect(ficha).not.toContain('eliminar');
  });
});
