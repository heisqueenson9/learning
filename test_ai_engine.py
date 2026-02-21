import sys
sys.path.append('c:/Users/USER/Desktop/APEX/backend')

from app.services.ai_engine import ai_engine
import json

logic = {"num_questions": 1000, "topic": "test"}
res = ai_engine._mock_generation("text", logic)
parsed = json.loads(res)
print(f"Num questions returned: {len(parsed['questions'])}")
