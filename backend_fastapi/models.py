from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Table, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from config import settings
from database import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": settings.SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    static_id = Column(String(6), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    rank = Column(String(100), default="Рядовой")
    unit = Column(String(255), default="")
    role = Column(String(20), nullable=False, default="cadet")
    is_whitelisted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    discord_id = Column(String(255), nullable=True)
    avatar_url = Column(String(1024), nullable=True)

class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = {"schema": settings.SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey(f"{settings.SCHEMA}.users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

class TestQuestion(Base):
    __tablename__ = "test_questions"
    __table_args__ = {"schema": settings.SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False) # choice, multichoice, matching, essay
    question_text = Column(Text, nullable=False)
    options = Column(JSONB, nullable=True)
    correct_answer = Column(JSONB, nullable=False)
    explanation = Column(Text, nullable=True)
    elo_rating = Column(Integer, default=1000)
    criteria_matrix = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class TestAttempt(Base):
    __tablename__ = "test_attempts"
    __table_args__ = {"schema": settings.SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(f"{settings.SCHEMA}.users.id", ondelete="CASCADE"), nullable=False)
    subject = Column(String(255), nullable=False, default="Тест по ФЗ ФСВНГ и уставу ФСВНГ")
    status = Column(String(50), nullable=False, default="in_progress") # in_progress, completed, aborted
    difficulty = Column(Integer, nullable=False, default=5)
    start_elo = Column(Integer, nullable=False, default=1000)
    end_elo = Column(Integer, nullable=True)
    warnings_count = Column(Integer, nullable=False, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    remaining_seconds = Column(Integer, nullable=True)

    user = relationship("User")

class TestAnswer(Base):
    __tablename__ = "test_answers"
    __table_args__ = {"schema": settings.SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey(f"{settings.SCHEMA}.test_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey(f"{settings.SCHEMA}.test_questions.id", ondelete="CASCADE"), nullable=False)
    student_answer = Column(JSONB, nullable=False)
    is_correct = Column(Boolean, nullable=True)
    grade = Column(Numeric(5, 2), nullable=True)
    feedback = Column(Text, nullable=True)
    criteria_evaluation = Column(JSONB, nullable=True)
    answered_at = Column(DateTime, default=datetime.utcnow)

    attempt = relationship("TestAttempt")
    question = relationship("TestQuestion")

class StudentElo(Base):
    __tablename__ = "student_elo"
    __table_args__ = {"schema": settings.SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(f"{settings.SCHEMA}.users.id", ondelete="CASCADE"), nullable=False)
    subject = Column(String(255), nullable=False)
    elo_rating = Column(Integer, nullable=False, default=1000)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")

class TestSettings(Base):
    __tablename__ = "test_settings"
    __table_args__ = {"schema": settings.SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(255), unique=True, nullable=False)
    timer_minutes = Column(Integer, nullable=False, default=45)
    question_count = Column(Integer, nullable=False, default=30)
    base_elo = Column(Integer, nullable=False, default=1000)
    time_limit_per_question = Column(Integer, nullable=False, default=0)
    passing_score_percent = Column(Integer, nullable=False, default=80)


class CustomMaterial(Base):
    __tablename__ = "custom_materials"
    __table_args__ = {"schema": settings.SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    material_type = Column(String(50), unique=True, nullable=False)
    data = Column(JSONB, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


