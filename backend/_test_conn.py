import psycopg2

casos = [
    ("user_prod / password123", "user_prod", "password123"),
]

for nombre, user, pw in casos:
    print("---", nombre, "---")
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5433,
            dbname="db_autenticacion_seguridad",
            user=user,
            password=pw,
            connect_timeout=10,
        )
        print("CONEXION OK")
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        print(cur.fetchall())
        conn.close()
    except Exception as e:
        print("ERROR TYPE:", type(e).__name__)
        print("ERROR MSG:", e)
