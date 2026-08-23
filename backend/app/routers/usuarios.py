from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.basededatos import get_db
from app import models
from app.schemas import (
    UsuarioCrear,
    UsuarioEditar,
    UsuarioPasswordReset,
    UsuarioRespuesta,
)
from app.utils.jwt import requiere_admin_org

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# HELPERS INTERNOS

def _obtener_usuario_de_la_organizacion(db: Session, usuario_id: int, organizacion_id: int):
    """
    Anti-IDOR: mismo patrón que tratamientos_service.py (filtrar por id Y
    organizacion_id en el propio query, nunca buscar solo por id y chequear
    después). Devuelve None tanto si el id no existe como si es de otra
    organización, el router siempre responde 404 en ambos casos, para no
    filtrar si ese id existe en otra organización.
    """
    return (
        db.query(models.Usuario)
        .filter(
            models.Usuario.id == usuario_id,
            models.Usuario.organizacion_id == organizacion_id,
        )
        .first()
    )


def _permisos_de(db: Session, usuario_id: int):
    return (
        db.query(models.PermisoUsuario)
        .filter(models.PermisoUsuario.usuario_id == usuario_id)
        .first()
    )


def _es_ultimo_admin_activo(db: Session, usuario_id: int, organizacion_id: int) -> bool:
    """
    True si `usuario_id` es el único ADMIN_ORG activo de la organización —
    usado para bloquear tanto DELETE como "degradar" (PUT que baja a MIEMBRO
    o desactiva) al último admin, tal como pide la tarjeta.
    """
    admins_activos = (
        db.query(models.Usuario.id)
        .filter(
            models.Usuario.organizacion_id == organizacion_id,
            models.Usuario.rol == "ADMIN_ORG",
            models.Usuario.activo.is_(True),
        )
        .all()
    )
    ids_admins = [row[0] for row in admins_activos]
    return len(ids_admins) == 1 and ids_admins[0] == usuario_id


def _correo_disponible(db: Session, correo: str) -> bool:
    """
    Correo único cruzando `usuarios` Y `organizaciones` (R10.2, decisión de
    diseño): Usuario.correo es único solo dentro de su propia tabla — nada en
    la BD impide crear un Usuario con el mismo correo que el admin de
    plataforma o una organización todavía sin migrar (R10.4). Como el login
    (R10.1) busca primero en `usuarios`, ese correo duplicado le robaría el
    login a la cuenta vieja. Se valida contra las dos tablas acá.
    """
    en_usuarios = db.query(models.Usuario).filter(models.Usuario.correo == correo).first()
    if en_usuarios:
        return False
    en_organizaciones = db.query(models.Organizacion).filter(models.Organizacion.correo == correo).first()
    return en_organizaciones is None


# ENDPOINTS

@router.post(
    "",
    response_model=UsuarioRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Crear usuario en la propia organización",
)
def crear_usuario(
    datos: UsuarioCrear,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(requiere_admin_org),
):
    if not _correo_disponible(db, datos.correo):
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    nuevo = models.Usuario(
        organizacion_id=admin.organizacion_id,  # nunca del body
        nombre=datos.nombre,
        correo=datos.correo,
        password=pwd_context.hash(datos.password),
        rol=datos.rol,
        creado_por=admin.id,
        debe_cambiar_password=True,
        activo=True,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    permisos = None
    if nuevo.rol == "MIEMBRO":
        entrada = datos.permisos.model_dump() if datos.permisos else {}
        permisos = models.PermisoUsuario(usuario_id=nuevo.id, **entrada)
        db.add(permisos)
        db.commit()

    return UsuarioRespuesta(
        id=nuevo.id,
        nombre=nuevo.nombre,
        correo=nuevo.correo,
        rol=nuevo.rol,
        activo=nuevo.activo,
        debe_cambiar_password=nuevo.debe_cambiar_password,
        creado_en=nuevo.creado_en,
        permisos=permisos,
    )


@router.get(
    "",
    response_model=list[UsuarioRespuesta],
    summary="Listar usuarios de la propia organización",
)
def listar_usuarios(
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(requiere_admin_org),
):
    usuarios = (
        db.query(models.Usuario)
        .filter(models.Usuario.organizacion_id == admin.organizacion_id)
        .order_by(models.Usuario.creado_en)
        .all()
    )
    return [
        UsuarioRespuesta(
            id=u.id,
            nombre=u.nombre,
            correo=u.correo,
            rol=u.rol,
            activo=u.activo,
            debe_cambiar_password=u.debe_cambiar_password,
            creado_en=u.creado_en,
            permisos=_permisos_de(db, u.id) if u.rol == "MIEMBRO" else None,
        )
        for u in usuarios
    ]


@router.put(
    "/{usuario_id}",
    response_model=UsuarioRespuesta,
    summary="Editar usuario de la propia organización",
)
def editar_usuario(
    usuario_id: int,
    datos: UsuarioEditar,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(requiere_admin_org),
):
    usuario = _obtener_usuario_de_la_organizacion(db, usuario_id, admin.organizacion_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # "Degradar" a un ADMIN_ORG (a MIEMBRO o a inactivo) no puede dejar la
    # organización sin ningún ADMIN_ORG activo — mismo guard que DELETE.
    se_degrada = (
        usuario.rol == "ADMIN_ORG"
        and (
            (datos.rol is not None and datos.rol != "ADMIN_ORG")
            or (datos.activo is False)
        )
    )
    if se_degrada and _es_ultimo_admin_activo(db, usuario.id, admin.organizacion_id):
        raise HTTPException(
            status_code=400,
            detail="No se puede degradar/desactivar: es el único ADMIN_ORG activo de la organización",
        )

    if datos.nombre is not None:
        usuario.nombre = datos.nombre
    if datos.activo is not None:
        usuario.activo = datos.activo
    if datos.rol is not None:
        usuario.rol = datos.rol

    db.commit()
    db.refresh(usuario)

    permisos = _permisos_de(db, usuario.id)
    if usuario.rol == "MIEMBRO":
        if datos.permisos is not None:
            if permisos is None:
                permisos = models.PermisoUsuario(usuario_id=usuario.id, **datos.permisos.model_dump())
                db.add(permisos)
            else:
                for campo, valor in datos.permisos.model_dump().items():
                    setattr(permisos, campo, valor)
            db.commit()
            db.refresh(permisos)
    elif permisos is not None:
        # Pasó a ADMIN_ORG: no le hace nada tener la fila (requiere_permiso
        # ya corta antes para ADMIN_ORG), pero se limpia para no dejar datos
        # huérfanos.
        db.delete(permisos)
        db.commit()
        permisos = None

    return UsuarioRespuesta(
        id=usuario.id,
        nombre=usuario.nombre,
        correo=usuario.correo,
        rol=usuario.rol,
        activo=usuario.activo,
        debe_cambiar_password=usuario.debe_cambiar_password,
        creado_en=usuario.creado_en,
        permisos=permisos,
    )


@router.delete("/{usuario_id}", summary="Eliminar usuario de la propia organización")
def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(requiere_admin_org),
):
    usuario = _obtener_usuario_de_la_organizacion(db, usuario_id, admin.organizacion_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if usuario.rol == "ADMIN_ORG" and usuario.activo and _es_ultimo_admin_activo(db, usuario.id, admin.organizacion_id):
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: es el único ADMIN_ORG activo de la organización",
        )

    try:
        db.delete(usuario)
        db.commit()
    except IntegrityError:
        db.rollback()
        # Choca porque este usuario creó a otro que sigue existiendo
        # (creado_por), o porque tiene historial de ediciones asociado.
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: este usuario tiene registros asociados (usuarios creados por él, o historial de ediciones)",
        )

    return {"mensaje": "Usuario eliminado correctamente", "id": usuario_id}


@router.put("/{usuario_id}/password", summary="Resetear la contraseña de un usuario")
def resetear_password(
    usuario_id: int,
    datos: UsuarioPasswordReset,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(requiere_admin_org),
):
    usuario = _obtener_usuario_de_la_organizacion(db, usuario_id, admin.organizacion_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    usuario.password = pwd_context.hash(datos.password_nueva)
    # A diferencia del autoservicio de organizaciones.py, acá el admin
    # resetea sin conocer la clave anterior -> se fuerza a cambiarla de nuevo.
    usuario.debe_cambiar_password = True
    db.commit()

    return {"mensaje": "Contraseña actualizada correctamente"}
