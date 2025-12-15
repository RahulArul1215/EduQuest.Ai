from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, DateTime,ForeignKey,JSON
from datetime import datetime
from sqlalchemy.sql import func

Base = declarative_base()

class Users(Base):
    __tablename__ = "users"   # recommended lowercase tables

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Chats(Base):
    __tablename__= "chats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)   # NEW
    title = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)



class Messages(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # NULL for assistant messages
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Documents(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    num_chunks = Column(Integer, default=0)



class DocChunks(Base):
    __tablename__ = "doc_chunks"

    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(String, nullable=False)
    embedding = Column(JSON, nullable=False)  # store list of floats
    created_at = Column(DateTime, default=datetime.utcnow)


class QuizSessions(Base):
    __tablename__ = "quiz_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    # how many questions were requested
    num_questions = Column(Integer, nullable=False)
    
    # stores the full quiz – questions, options, correct answers
    quiz_json = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)


class QuizAttempts(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quiz_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # user’s selected answers, e.g. { "1": "A", "2": "C", ... }
    user_answers = Column(JSON, nullable=False)

    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    attempted_at = Column(DateTime(timezone=True), server_default=func.now()) 
