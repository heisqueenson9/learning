from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.session import get_db
from app.core.config import settings
from app.models import user as model_user
from app.schemas import user as schema_user

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        phone_number: str = payload.get("sub")
        if phone_number is None:
            raise credentials_exception
        token_data = schema_user.TokenData(phone_number=phone_number)
    except JWTError:
        raise credentials_exception
    
    user = db.query(model_user.User).filter(model_user.User.phone_number == token_data.phone_number).first()
    if user is None:
        raise credentials_exception
        
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive.")

    # Enforce subscription expiry on every API call
    if user.expiry_date and user.expiry_date < datetime.utcnow():
        # Auto-deactivate expired user
        user.is_active = False
        db.commit()
        raise HTTPException(
            status_code=403,
            detail="Your subscription has expired. Please purchase a new plan to continue."
        )
        
    return user
