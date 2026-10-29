from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

DATABASE_URL = f"sqlite:///{settings.DB_PATH.as_posix()}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from app.models.db_models import DBReading, DBEvent, DBThreshold
    Base.metadata.create_all(bind=engine)
    
    # Initialize default thresholds if not present
    db = SessionLocal()
    try:
        existing = db.query(DBThreshold).first()
        if not existing:
            default_thresh = DBThreshold(
                temp_warn=60.0,
                temp_crit=70.0,
                temp_hysteresis=3.0,
                pressure_warn=65.0,
                pressure_crit=55.0,
                pressure_hysteresis=2.0,
                power_warn=10.0,
                power_crit=15.0,
                power_hysteresis=1.0,
                voltage_min=10.5,
                voltage_max=14.5,
                current_max=2.0
            )
            db.add(default_thresh)
            db.commit()
    finally:
        db.close()
