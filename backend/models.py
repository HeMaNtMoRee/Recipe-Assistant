"""SQLAlchemy models and Pydantic schemas."""

import json
from sqlalchemy import Column, Integer, String, Text, Float
from database import Base
from pydantic import BaseModel
from typing import Optional


# ── SQLAlchemy ORM Model ──────────────────────────────────────────────

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, default="")
    ingredients = Column(Text, default="[]")       # stored as JSON string
    instructions = Column(Text, default="[]")      # stored as JSON string
    cuisine = Column(String(100), default="")
    category = Column(String(100), default="")
    prep_time = Column(String(50), default="")
    cook_time = Column(String(50), default="")
    total_time = Column(String(50), default="")
    servings = Column(String(50), default="")
    calories = Column(Float, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "ingredients": json.loads(self.ingredients) if self.ingredients else [],
            "instructions": json.loads(self.instructions) if self.instructions else [],
            "cuisine": self.cuisine,
            "category": self.category,
            "prep_time": self.prep_time,
            "cook_time": self.cook_time,
            "total_time": self.total_time,
            "servings": self.servings,
            "calories": self.calories,
        }


# ── Pydantic Schemas ──────────────────────────────────────────────────

class RecipeIn(BaseModel):
    title: str
    description: Optional[str] = ""
    ingredients: list[str] = []
    instructions: list[str] = []
    cuisine: Optional[str] = ""
    category: Optional[str] = ""
    prep_time: Optional[str] = ""
    cook_time: Optional[str] = ""
    total_time: Optional[str] = ""
    servings: Optional[str] = ""
    calories: Optional[float] = None


class SearchQuery(BaseModel):
    query: str
    top_k: int = 5


class ChatQuery(BaseModel):
    message: str
    top_k: int = 5
