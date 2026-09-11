from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "ENFORCEMENT_OFFICER"
    location_unit: Optional[str] = "Delhi Zone"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: str
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
