from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.schemas import user as schema_user
from app.models import user as model_user

router = APIRouter()

@router.get("/me", response_model=schema_user.UserInDB)
def read_users_me(current_user: model_user.User = Depends(get_current_user)):
    return current_user
