from sqlalchemy import create_engine # habla con sql
from sqlalchemy.ext.declarative import declarative_base # importa la clase base que heredarán las tablas
from sqlalchemy.orm import sessionmaker # hace sesiones de bbdd (una conversación con la bbdd es una sesion)
from dotenv import load_dotenv # este lee el archivo .env
import os # os lee las variables, es para no tener que escribir la contraseña en el código

load_dotenv() # esto es lo que lee el .env

# las variables del .env las guarda en variables de python
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

# construye la url de conexión completa que sql entiende
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# crea el motor de conexión a la base de datos usando la url
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) # fabrica de sesiones, pero autocommit falso significa que no se guardaran los cambios sin que confirmemos con db.commit()
Base = declarative_base() # molde que heredarán los modelos / tablas 

# generador que fast api usa automaticamente cuando los endpoints piden hablar con la bbdd
# fast api llama a la función y abre una sesión y se la entrega al endpoint con yield, y con el db.close cierra la sesion
def get_bd():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()