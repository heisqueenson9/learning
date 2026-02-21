from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
import json
import asyncio
from datetime import datetime
from app.db.session import get_db
from app.models.exam import Exam
from app.services.ai_engine import ai_engine
from app.services.file_processor import extract_text

router = APIRouter()


@router.post("/generate")
async def generate_exam(
    background_tasks: BackgroundTasks,
    topic: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    level: str = Form(...),
    exam_type: str = Form(...),
    difficulty: str = Form(...),
    db: Session = Depends(get_db)
):
    """Generate 100 MCQ questions for a given topic or uploaded file."""
    try:
        text_content = ""
        file_location = None
        topic_name = topic if topic else "Uploaded Document"

        if file and file.filename:
            try:
                safe_filename = f"temp_{int(datetime.utcnow().timestamp())}_{file.filename}"
                file_location = os.path.join("/tmp", safe_filename)

                file_bytes = await file.read()
                await asyncio.to_thread(_save_bytes, file_bytes, file_location)

                print(f"File saved: {file_location} ({len(file_bytes)} bytes)")

                text_content = await asyncio.to_thread(extract_text, file_location)
                print(f"Extracted {len(text_content)} chars from file.")

                topic_name = file.filename
                background_tasks.add_task(_delayed_cleanup, file_location)

            except Exception as e:
                print(f"File processing error: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

        elif topic:
            text_content = f"Topic: {topic}. Level: {level}. Generate 100 comprehensive questions for this topic."
        else:
            raise HTTPException(status_code=400, detail="Either a file or a topic is required.")

        logic = {
            "topic": topic_name,
            "level": level,
            "exam_type": exam_type,
            "difficulty": difficulty,
            "num_questions": 100
        }

        print(f"Generating 100 questions for topic: {logic['topic']}")

        # Run AI generation in thread pool (non-blocking)
        generated_content_str = await asyncio.to_thread(ai_engine.generate_questions, text_content, logic)

        # Parse the generated content to return proper JSON
        try:
            parsed_content = json.loads(generated_content_str)
        except Exception:
            parsed_content = {"title": topic_name, "questions": []}

        # Save exam record to DB
        new_exam = Exam(
            title=f"{topic_name} — {exam_type}",
            level=level,
            topic=topic_name,
            difficulty=difficulty,
            exam_type=exam_type,
            questions=generated_content_str  # Store as JSON string in DB
        )
        db.add(new_exam)
        db.commit()
        db.refresh(new_exam)

        # Return the parsed questions directly so frontend doesn't need to double-parse
        return {
            "id": new_exam.id,
            "title": new_exam.title,
            "questions": parsed_content,  # Return as object, not string
            "created_at": new_exam.created_at.isoformat() if new_exam.created_at else None
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Critical Error in generate_exam: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


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
    try:
        exams = (
            db.query(Exam)
            .order_by(Exam.created_at.desc())
            .all()
        )
        result = []
        for e in exams:
            try:
                created_at_val = e.created_at.isoformat() if e.created_at else None
            except Exception:
                created_at_val = str(e.created_at) if e.created_at else None

            result.append({
                "id": e.id,
                "title": e.title or "Untitled Exam",
                "topic": e.topic or "",
                "level": e.level or "",
                "exam_type": e.exam_type or "",
                "difficulty": e.difficulty or "",
                "created_at": created_at_val,
            })
        return {"exams": result, "total": len(result)}
    except Exception as e:
        print(f"History fetch error: {str(e)}")
        # Return empty gracefully so frontend doesn't crash
        return {"exams": [], "total": 0}


@router.get("/{exam_id}")
def get_exam(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return {
        "id": exam.id,
        "title": exam.title,
        "questions": exam.questions,
        "created_at": exam.created_at.isoformat() if exam.created_at else None
    }
