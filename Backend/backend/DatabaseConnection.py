
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

#Making database connection
db_url = "postgresql://postgres:rahularul@localhost:5432/EduQuest"
engine = create_engine(db_url)
session = sessionmaker(autocommit=False, autoflush=False, bind=engine)