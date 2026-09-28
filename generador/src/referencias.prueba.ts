import { describe, expect, it } from 'vitest';
import { GenerarRecurso } from './comandos/generar-recurso.js';
import { ReferenciaFueraDelAlcance, ReferenciaSinGenerar } from './comandos/resolver-referencias.js';
import { referencia, texto } from './definicion/campos.js';
import { definirRecurso, type EntradaDeRecurso } from './definicion/definir-recurso.js';
import { DefinicionInvalida } from './definicion/errores.js';
import { EscritorDeArchivos } from './motor/escritor-de-archivos.js';
import { SistemaDeArchivosEnMemoria } from './motor/sistema-de-archivos.js';
import { CLIENTE, MODULO_GENERADO, SERVIDOR } from './pruebas/modulo-de-prueba.js';

const potrero: EntradaDeRecurso = {
  modulo: 'ganado',
  entidad: 'Potrero',
  plural: 'Potreros',
  alcance: 'empresa',
  pantalla: 'catalogo',
  campos: { nombre: texto({ requerido: true }) },
};

const animal: EntradaDeRecurso = {
  modulo: 'ganado',
  entidad: 'Animal',
  plural: 'Animales',
  alcance: 'empresa',
  pantalla: 'catalogo',
  campos: {
    arete: texto({ requerido: true }),
    potrero: referencia('Potrero', { requerido: true }),
    madre: referencia('Animal'),
  },
};

const TABLAS_DE_POTREROS = `${SERVIDOR}/infraestructura/persistencia/potreros.tablas.ts`;

/** Genera el animal con el potrero ya generado (su tabla existe), salvo que se diga otra cosa. */
async function generar({ entrada = animal, referida = potrero, potrerosGenerados = true } = {}) {
  const disco = new SistemaDeArchivosEnMemoria({
    ...MODULO_GENERADO,
    ...(potrerosGenerados ? { [TABLAS_DE_POTREROS]: '' } : {}),
  });
  const escritor = new EscritorDeArchivos(disco, '/p');
  const definiciones: Record<string, EntradaDeRecurso> = { 'ganado/animal': entrada, 'ganado/potrero': referida };
  await new GenerarRecurso(escritor, async (ruta) => definirRecurso(definiciones[ruta]!)).ejecutar('ganado/animal');
  escritor.confirmar();
  return {
    servidor: (archivo: string) => disco.leer(`${SERVIDOR}/${archivo}`),
    cliente: (archivo: string) => disco.leer(`${CLIENTE}/${archivo}`),
    pruebaDeApi: () => disco.leer('/p/servidor/src/pruebas-api/ganado-animales.api.prueba.ts'),
  };
}

describe('referencias en el servidor', () => {
  it('cada una es una llave foránea con su índice, también hacia la misma tabla', async () => {
    const tabla = (await generar()).servidor('infraestructura/persistencia/animales.tablas.ts');

    expect(tabla).toContain("import { potreros } from './potreros.tablas.js';");
    expect(tabla).toContain('potreroId: uuid().references((): AnyPgColumn => potreros.id).notNull(),');
    expect(tabla).toContain('madreId: uuid().references((): AnyPgColumn => animales.id),');
    expect(tabla).toContain("index('animales_potrero_idx').on(t.potreroId)");
  });

  it('la consulta trae el nombre de lo elegido y comprueba que exista antes de guardar', async () => {
    const { servidor } = await generar();
    const consultas = servidor('infraestructura/persistencia/consultas-animales.drizzle.ts');

    expect(consultas).toContain("const madre = alias(animales, 'madre');");
    expect(consultas).toContain('potreroNombre: potrero.nombre, madreNombre: madre.arete');
    expect(consultas).toContain('.leftJoin(potrero, eq(animales.potreroId, potrero.id))');
    expect(consultas).toContain("await exigirQueExista(potreros, solicitud.potreroId, 'El potrero');");
    expect(servidor('aplicacion/casos-uso/animales/crear-animal.ts')).toContain(
      'await consultas.exigirReferencias(solicitud);',
    );
    expect(servidor('aplicacion/dto/animal.dto.ts')).toContain(
      "Omit<AnimalDto, 'id' | 'potreroNombre' | 'madreNombre'>",
    );
  });

  it('la prueba de API registra antes el potrero y rechaza uno de otra cuenta', async () => {
    const prueba = (await generar()).pruebaDeApi();

    expect(prueba).toContain("await usuario.post('/api/ganado/potreros', { nombre: 'Registro de prueba' });");
    expect(prueba).toContain('return { potreroId: potrero.cuerpo.id as string, madreId: null };');
    expect(prueba).toContain("it('no acepta un potrero de otra cuenta'");
  });
});

describe('referencias en el cliente', () => {
  it('se eligen en un selector con los registros por su nombre, y la tarjeta muestra ese nombre', async () => {
    const { cliente } = await generar();

    expect(cliente('componentes/animales/VentanaDeAnimal.vue')).toContain(
      '<CampoSelector v-model="edicion.potreroId" etiqueta="Potrero" :opciones="referencias.potreroId" requerido',
    );
    expect(cliente('composables/animales/referencias-de-animal.ts')).toContain(
      'madreId: opcionesDeRegistros(registros.value, (animal) => String(animal.arete), false),',
    );
    expect(cliente('composables/animales/detalles-de-animal.ts')).toContain('formatearTexto(registro.potreroNombre)');
    expect(cliente('composables/animales/edicion-de-animal.ts')).toContain("potreroId: edicion.potreroId ?? '',");
  });
});

describe('lo que no se puede referenciar', () => {
  it('un recurso que todavía no se generó', async () => {
    await expect(generar({ potrerosGenerados: false })).rejects.toThrow(ReferenciaSinGenerar);
  });

  it('uno de cada empresa desde uno de toda la cuenta', async () => {
    await expect(generar({ entrada: { ...animal, alcance: 'cuenta' } })).rejects.toThrow(ReferenciaFueraDelAlcance);
  });

  it('la misma entidad como obligatoria, un nombre con "Id" o una referencia como nombre del registro', () => {
    const conProblemas = (campos: EntradaDeRecurso['campos'], mostrar?: string) => () =>
      definirRecurso({ ...animal, campos: { ...animal.campos, ...campos }, mostrar });

    expect(conProblemas({ madre: referencia('Animal', { requerido: true }) })).toThrow(DefinicionInvalida);
    expect(conProblemas({ padreId: referencia('Animal') })).toThrow(DefinicionInvalida);
    expect(conProblemas({}, 'potrero')).toThrow(DefinicionInvalida);
  });
});
