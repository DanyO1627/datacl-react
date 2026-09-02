"""
Migración de datos R10.4 — de un solo uso, NO se deja corriendo en cada
deploy (a diferencia de migrate_add_columns.py, que solo agrega columnas).

Por cada Organizacion con rol='ORGANIZACION' (todas menos el admin de
plataforma, rol='ADMIN'), crea una fila Usuario con rol='ADMIN_ORG', mismo
correo/contraseña/nombre — para que esas cuentas puedan loguear por el
camino nuevo (R10.1, ver auth.py) sin que nadie tenga que hacer nada ni
cambiar su contraseña.

Organizacion.password ya viene hasheado con bcrypt (mismo pwd_context que
usa auth.py para validar login) — se copia tal cual a Usuario.password,
NO se re-hashea.

Idempotente: si ya existe un Usuario con ese correo, se salta esa fila.
Correr el script 2 veces no duplica nada.

Ejecutar:  python migrate_usuarios_desde_organizaciones.py
"""
from app.basededatos import SessionLocal
from app import models


def main():
    db = SessionLocal()
    migrados = 0
    saltados = 0
    try:
        orgs = (
            db.query(models.Organizacion)
            .filter(models.Organizacion.rol == "ORGANIZACION")
            .all()
        )

        for org in orgs:
            ya_existe = (
                db.query(models.Usuario)
                .filter(models.Usuario.correo == org.correo)
                .first()
            )
            if ya_existe:
                print(f"  = {org.correo} (ya existe un Usuario, se salta)")
                saltados += 1
                continue

            nuevo = models.Usuario(
                organizacion_id=org.id,
                correo=org.correo,
                password=org.password,
                nombre=org.nombre,
                rol="ADMIN_ORG",
                debe_cambiar_password=False,
                activo=True,
            )
            db.add(nuevo)
            db.commit()
            db.refresh(nuevo)
            print(f"  + {org.correo} -> Usuario id={nuevo.id} (organizacion id={org.id})")
            migrados += 1

    finally:
        db.close()

    print(f"\nMigración completada: {migrados} migrado(s), {saltados} saltado(s).")


if __name__ == "__main__":
    main()
