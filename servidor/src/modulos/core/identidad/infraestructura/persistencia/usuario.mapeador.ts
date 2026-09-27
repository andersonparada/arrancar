import { valorDe } from '../../../compartido/dominio/objeto-valor.js';
import { Identificador } from '../../../compartido/dominio/identificador.js';
import { Correo } from '../../../compartido/dominio/objetos-valor/correo.js';
import { NombreDeUsuario } from '../../dominio/nombre-de-usuario.js';
import { Usuario } from '../../dominio/usuario.js';
import type { usuarios } from './usuarios.tablas.js';

type FilaDeUsuario = typeof usuarios.$inferSelect;

export const mapeadorDeUsuario = {
  aEntidad(fila: FilaDeUsuario): Usuario {
    return Usuario.reconstruir({
      id: Identificador.desde(fila.id),
      nombreDeUsuario: NombreDeUsuario.crear(fila.usuario),
      nombres: fila.nombres,
      apellidos: fila.apellidos,
      correo: fila.correo ? Correo.crear(fila.correo) : null,
      hashContrasena: fila.hashContrasena,
      esSuperacceso: fila.esSuperacceso,
      activo: fila.activo,
    });
  },

  aFila(usuario: Usuario) {
    const { id, nombreDeUsuario, correo, ...datos } = usuario.instantanea();
    return { ...datos, id: id.valor, usuario: nombreDeUsuario.valor, correo: valorDe(correo) };
  },
};
