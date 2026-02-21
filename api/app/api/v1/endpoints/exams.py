from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
import os
import shutil
import asyncio
from datetime import datetime
from app.db.session import get_db
from app.models.exam import Exam
from app.schemas.exam import ExamResponse
from app.services.ai_engine import ai_engine
from app.services.file_processor import extract_text

router = APIRouter()

@router.post("/generate", response_model=ExamResponse)
async def generate_exam(
    background_tasks: BackgroundTasks,
    topic: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    level: str = Form(...),
    exam_type: str = Form(...),
    difficulty: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        text_content = ""
        file_location = None

        if file:
            try:
                safe_filename = f"temp_{int(datetime.utcnow().timestamp())}_{file.filename}"
                file_location = os.path.join("temp_uploads", safe_filename)
                os.makedirs("temp_uploads", exist_ok=True)

                file_bytes = await file.read()
                await asyncio.to_thread(_save_bytes, file_bytes, file_location)

                print(f"File saved: {file_location} ({len(file_bytes)} bytes)")

                text_content = await asyncio.to_thread(extract_text, file_location)
                print(f"Extracted {len(text_content)} chars from file.")

                background_tasks.add_task(_delayed_cleanup, file_location)

            except Exception as e:
                print(f"File processing error: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

        elif topic:
            text_content = f"Topic: {topic}. Level: {level}. Generate 50 comprehensive questions for this topic."
        else:
            raise HTTPException(status_code=400, detail="Either a File or a Topic is required.")

        logic = {
            "topic": topic if topic else (file.filename if file else "Uploaded Document"),
            "level": level,
            "exam_type": exam_type,
            "difficulty": difficulty
        }

        print(f"Generating 50 questions for topic: {logic['topic']}")

        # Run AI generation in thread pool
        generated_content = await asyncio.to_thread(ai_engine.generate_questions, text_content, logic)

        new_exam = Exam(
            title=f"{logic['topic']} — {exam_type}",
            level=level,
            topic=logic['topic'],
            difficulty=difficulty,
            exam_type=exam_type,
            questions=generated_content
        )
        db.add(new_exam)
        db.commit()
        db.refresh(new_exam)

        return new_exam

    except HTTPException:
        raise
    except Exception as e:
        print(f"Critical System Error: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected system error occurred.")


def _save_bytes(data: bytes, path: str):
    """Write bytes to file synchronously (run in thread pool)."""
    with open(path, "wb") as f:
        f.write(data)


def _delayed_cleanup(path: str):
    """Delete a temp file safely."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
            print(f"Cleaned up: {path}")
    except Exception as e:
        print(f"Cleanup failed for {path}: {e}")


@router.get("/history")
def get_exam_history(db: Session = Depends(get_db)):
    """Return all exams generated (most recent first)."""
    exams = (
        db.query(Exam)
        .order_by(Exam.created_at.desc())
        .all()
    )
    result = []
    for e in exams:
        result.append({
            "id": e.id,
            "title": e.title,
            "topic": e.topic,
            "level": e.level,
            "exam_type": e.exam_type,
            "difficulty": e.difficulty,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        })
    return {"exams": result, "total": len(result)}


@router.get("/{exam_id}", response_model=ExamResponse)
def get_exam(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam
