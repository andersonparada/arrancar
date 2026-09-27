import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import { NitInvalido } from '../../../core/compartido/dominio/objetos-valor/nit.js';
import {
  PublicadorEventosEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../core/compartido/pruebas/dobles-compartidos.js';
import { TerceroInactivo } from '../../dominio/errores.js';
import { CategoriasEnMemoria, TercerosEnMemoria } from '../../pruebas/dobles-de-terceros.js';
import { AvisoDeParecidos } from '../aviso-de-parecidos.js';
import type { SolicitudDeTercero } from '../dto/tercero.dto.js';
import { HayTercerosParecidos } from '../errores.js';
import { AsignarPapel } from './papeles/asignar-papel.js';
import { QuitarPapel } from './papeles/quitar-papel.js';
import { ActualizarTercero } from './terceros/actualizar-tercero.js';
import { RegistrarTercero } from './terceros/registrar-tercero.js';

let terceros: TercerosEnMemoria;
let publicadorEventos: PublicadorEventosEnMemoria;
let operador: Operador;
let casos: { registrar: RegistrarTercero; actualizar: ActualizarTercero; asignar: AsignarPapel; quitar: QuitarPapel };

function solicitud(cambios: Partial<SolicitudDeTercero> = {}): SolicitudDeTercero {
  return {
    tipo: 'individual',
    nombres: 'Juan',
    apellidos: 'Pérez',
    razonSocial: null,
    nombreComercial: null,
    nit: null,
    dpi: null,
    telefono: null,
    whatsapp: null,
    correo: null,
    departamentoCodigo: null,
    municipioCodigo: null,
    direccion: null,
    fotoArchivoId: null,
    notas: null,
    activo: true,
    confirmarDuplicado: false,
    ...cambios,
  };
}

beforeEach(() => {
  terceros = new TercerosEnMemoria();
  publicadorEventos = new PublicadorEventosEnMemoria();
  operador = operadorDePrueba();
  const unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  const avisoDeParecidos = new AvisoDeParecidos(terceros);
  const comunes = { unidadDeTrabajo, repositorio: terceros, consultas: terceros, publicadorEventos };
  casos = {
    registrar: new RegistrarTercero({ ...comunes, avisoDeParecidos }),
    actualizar: new ActualizarTercero({ ...comunes, avisoDeParecidos }),
    asignar: new AsignarPapel({ ...comunes, categorias: new CategoriasEnMemoria() }),
    quitar: new QuitarPapel(comunes),
  };
});

describe('registrar un tercero', () => {
  it('lo guarda y avisa que se creó, después de guardarlo', async () => {
    const registrado = await casos.registrar.ejecutar(operador, solicitud());

    expect(registrado.nombreMostrar).toBe('Juan Pérez');
    expect(publicadorEventos.nombres()).toEqual(['terceros.creado']);
  });

  it('si se parece a otro, no lo guarda ni avisa nada hasta que el usuario confirme', async () => {
    terceros.parecidos = [{ id: crypto.randomUUID(), nombreMostrar: 'Juan Perez', nit: null, dpi: null }];

    await expect(casos.registrar.ejecutar(operador, solicitud())).rejects.toThrow(HayTercerosParecidos);
    expect(terceros.cantidad()).toBe(0);
    expect(publicadorEventos.publicados).toEqual([]);

    await casos.registrar.ejecutar(operador, solicitud({ confirmarDuplicado: true }));
    expect(terceros.cantidad()).toBe(1);
  });

  it('rechaza un NIT inválido antes de tocar la base de datos', async () => {
    await expect(casos.registrar.ejecutar(operador, solicitud({ nit: '12345678' }))).rejects.toThrow(NitInvalido);
    expect(terceros.cantidad()).toBe(0);
  });
});

describe('cambiar un tercero', () => {
  it('al inactivarlo publica que se inactivó', async () => {
    const tercero = await casos.registrar.ejecutar(operador, solicitud());

    await casos.actualizar.ejecutar(operador, { terceroId: tercero.id, solicitud: solicitud({ activo: false }) });

    expect(publicadorEventos.nombres()).toEqual(['terceros.creado', 'terceros.inactivado']);
  });

  it('no encuentra terceros que no existen', async () => {
    const cambio = casos.actualizar.ejecutar(operador, { terceroId: crypto.randomUUID(), solicitud: solicitud() });

    await expect(cambio).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('papeles', () => {
  it('no asigna papeles a un tercero inactivo', async () => {
    const tercero = await casos.registrar.ejecutar(operador, solicitud({ activo: false }));

    const asignar = casos.asignar.ejecutar(operador, {
      terceroId: tercero.id,
      papel: { tipo: 'cliente', clase: 'directo', activo: true, notas: null },
    });

    await expect(asignar).rejects.toThrow(TerceroInactivo);
  });

  it('no asigna una categoría de proveedor que no existe', async () => {
    const tercero = await casos.registrar.ejecutar(operador, solicitud());

    const asignar = casos.asignar.ejecutar(operador, {
      terceroId: tercero.id,
      papel: { tipo: 'proveedor', categoriaId: crypto.randomUUID(), activo: true, notas: null },
    });

    await expect(asignar).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no quita un papel que el tercero nunca tuvo', async () => {
    const tercero = await casos.registrar.ejecutar(operador, solicitud());

    await expect(casos.quitar.ejecutar(operador, { terceroId: tercero.id, tipo: 'cliente' })).rejects.toThrow(
      RecursoNoEncontrado,
    );
  });

  it('asignar y quitar publican sus eventos', async () => {
    const tercero = await casos.registrar.ejecutar(operador, solicitud());
    const papel = { tipo: 'cliente', clase: 'subasta', activo: true, notas: null } as const;

    await casos.asignar.ejecutar(operador, { terceroId: tercero.id, papel });
    await casos.quitar.ejecutar(operador, { terceroId: tercero.id, tipo: 'cliente' });

    expect(publicadorEventos.nombres()).toEqual([
      'terceros.creado',
      'terceros.papel_asignado',
      'terceros.papel_quitado',
    ]);
  });
});
