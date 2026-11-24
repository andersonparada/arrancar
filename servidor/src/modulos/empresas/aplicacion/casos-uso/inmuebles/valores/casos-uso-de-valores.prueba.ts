import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../../core/compartido/aplicacion/errores.js';
import { ReglaDeNegocioInfringida } from '../../../../../core/compartido/dominio/errores.js';
import {
  AuditoriaEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../../core/compartido/pruebas/dobles-compartidos.js';
import { Inmueble } from '../../../../dominio/inmueble.js';
import { Identificador } from '../../../../../core/compartido/dominio/identificador.js';
import { ValorDeInmuebleInvalido, ValorDeInmuebleRepetido } from '../../../../dominio/valor-de-inmueble.js';
import { InmueblesEnMemoria } from '../../../../pruebas/dobles-de-inmuebles.js';
import {
  AvisosDeValorEnMemoria,
  ValoresDeInmuebleEnMemoria,
} from '../../../../pruebas/dobles-de-valores-de-inmueble.js';
import type { SolicitudDeValorDeInmueble } from '../../../dto/valor-de-inmueble.dto.js';
import { ListarInmueblesConValores } from '../inmuebles-en-excel.js';
import { EliminarValorDeInmueble } from './eliminar-valor-de-inmueble.js';
import { ListarValoresDeInmueble } from './listar-valores-de-inmueble.js';
import { RegistrarValorDeInmueble } from './registrar-valor-de-inmueble.js';

const operador = operadorDePrueba();

class UsadoEnCierre extends ReglaDeNegocioInfringida {
  readonly codigo = 'valor_de_inmueble_usado_en_cierre';
}

const solicitud = (cambios: Partial<SolicitudDeValorDeInmueble> = {}): SolicitudDeValorDeInmueble => ({
  fuente: 'matricula_fiscal',
  vigenteDesde: '2026-01-01',
  origen: 'avaluo_dicabi',
  valorTerreno: null,
  valorConstrucciones: null,
  valorCultivosPermanentes: null,
  valorTotal: '1000000.00',
  categoriaIusi: null,
  documento: null,
  ...cambios,
});

let inmuebles: InmueblesEnMemoria;
let valores: ValoresDeInmuebleEnMemoria;
let avisos: AvisosDeValorEnMemoria;
let auditoria: AuditoriaEnMemoria;
let inmuebleId: string;

async function armar() {
  inmuebles = new InmueblesEnMemoria();
  valores = new ValoresDeInmuebleEnMemoria();
  avisos = new AvisosDeValorEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const inmueble = Inmueble.crear(Identificador.desde(operador.empresaId), {
    nombre: 'Finca',
    situacionRegistral: 'posesorio',
    registro: null,
    numeroDeFinca: null,
    folio: null,
    libro: null,
    departamentoRegistral: null,
    documentoPosesorio: 'Escritura 1',
    titulacionSupletoriaEnTramite: false,
    titularidad: 'propia',
    porcentajeDeCopropiedad: null,
    titular: null,
    matriculaFiscal: null,
    administraIusi: null,
    codigoCatastral: null,
    departamentoCodigo: null,
    municipioCodigo: null,
    direccion: null,
    superficieRegistralM2: null,
    cantidadOriginal: null,
    unidadOriginal: null,
    varasPorLadoDeCuerda: null,
    localidadId: null,
    observaciones: null,
  });
  await inmuebles.agregar(inmueble);
  inmuebleId = inmueble.id.valor;
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    inmuebles,
    repositorio: valores,
    consultas: valores,
    avisos,
    auditoria,
  };
  return {
    registrar: new RegistrarValorDeInmueble(dependencias),
    eliminar: new EliminarValorDeInmueble(dependencias),
    listar: new ListarValoresDeInmueble(dependencias),
  };
}

let casos: Awaited<ReturnType<typeof armar>>;

beforeEach(async () => {
  casos = await armar();
});

describe('registrar un valor', () => {
  it('lo guarda, lo avisa a los demás módulos y aparece en el histórico', async () => {
    const creado = await casos.registrar.ejecutar(operador, { inmuebleId, solicitud: solicitud() });

    expect(await casos.listar.ejecutar(operador, inmuebleId)).toEqual([creado]);
    expect(avisos.registrados).toEqual([
      { inmuebleId, valorId: creado.id, fuente: 'matricula_fiscal', vigenteDesde: '2026-01-01' },
    ]);
  });

  it('las dos fuentes llevan su propia serie: la misma fecha en cada una es válida, no dos veces en la misma', async () => {
    await casos.registrar.ejecutar(operador, { inmuebleId, solicitud: solicitud() });
    await casos.registrar.ejecutar(operador, { inmuebleId, solicitud: solicitud({ fuente: 'catastro_municipal' }) });

    await expect(casos.registrar.ejecutar(operador, { inmuebleId, solicitud: solicitud() })).rejects.toThrow(
      ValorDeInmuebleRepetido,
    );
    expect(await casos.listar.ejecutar(operador, inmuebleId)).toHaveLength(2);
  });

  it('no guarda ni avisa un valor que rompe las reglas del dominio', async () => {
    await expect(
      casos.registrar.ejecutar(operador, { inmuebleId, solicitud: solicitud({ valorTotal: '0.00' }) }),
    ).rejects.toThrow(ValorDeInmuebleInvalido);

    expect(await casos.listar.ejecutar(operador, inmuebleId)).toEqual([]);
    expect(avisos.registrados).toEqual([]);
  });

  it('falla si el inmueble no existe', async () => {
    await expect(
      casos.registrar.ejecutar(operador, { inmuebleId: randomUUID(), solicitud: solicitud() }),
    ).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('eliminar un valor', () => {
  it('pregunta primero a los demás módulos, lo elimina y deja en la auditoría cómo estaba', async () => {
    const creado = await casos.registrar.ejecutar(operador, { inmuebleId, solicitud: solicitud() });

    await casos.eliminar.ejecutar(operador, { inmuebleId, valorId: creado.id });

    expect(avisos.porEliminarAvisados).toHaveLength(1);
    expect(await casos.listar.ejecutar(operador, inmuebleId)).toEqual([]);
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'empresas.inmuebles',
        accion: 'eliminar',
        registroId: creado.id,
        anterior: creado,
      }),
    ]);
  });

  it('si un módulo lo rechaza porque ya lo usó en un mes cerrado, el valor sigue y no se audita', async () => {
    const creado = await casos.registrar.ejecutar(operador, { inmuebleId, solicitud: solicitud() });
    avisos.rechazarEliminacion = new UsadoEnCierre('Lo usó un mes cerrado.');

    await expect(casos.eliminar.ejecutar(operador, { inmuebleId, valorId: creado.id })).rejects.toThrow(UsadoEnCierre);

    expect(await casos.listar.ejecutar(operador, inmuebleId)).toEqual([creado]);
    expect(auditoria.entradas).toEqual([]);
  });

  it('falla si el valor es de otro inmueble', async () => {
    const creado = await casos.registrar.ejecutar(operador, { inmuebleId, solicitud: solicitud() });

    await expect(casos.eliminar.ejecutar(operador, { inmuebleId, valorId: randomUUID() })).rejects.toThrow(
      RecursoNoEncontrado,
    );
    await expect(casos.eliminar.ejecutar(operador, { inmuebleId: randomUUID(), valorId: creado.id })).rejects.toThrow(
      RecursoNoEncontrado,
    );
  });
});

describe('inmuebles con sus valores vigentes', () => {
  it('trae el vigente de cada fuente hoy: el más reciente que no sea futuro', async () => {
    await casos.registrar.ejecutar(operador, {
      inmuebleId,
      solicitud: solicitud({ vigenteDesde: '2025-01-01', valorTotal: '800000.00' }),
    });
    await casos.registrar.ejecutar(operador, { inmuebleId, solicitud: solicitud({ vigenteDesde: '2026-01-01' }) });
    await casos.registrar.ejecutar(operador, {
      inmuebleId,
      solicitud: solicitud({ vigenteDesde: '2027-01-01', valorTotal: '1500000.00' }),
    });
    await casos.registrar.ejecutar(operador, {
      inmuebleId,
      solicitud: solicitud({ fuente: 'catastro_municipal', valorTotal: '900000.00' }),
    });
    const listar = new ListarInmueblesConValores({
      unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
      consultas: inmuebles,
      valores,
      reloj: new RelojFijo('2026-09-29'),
    });

    const [fila] = await listar.ejecutar(operador);

    expect(fila).toMatchObject({
      matriculaVigenteDesde: '2026-01-01',
      matriculaTotal: '1000000.00',
      catastroTotal: '900000.00',
      catastroVigenteDesde: '2026-01-01',
    });
  });
});
