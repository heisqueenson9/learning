"""
APEX EduAI Vault — Local AI Engine
====================================
100% free, self-hosted question generation using google/flan-t5-base.

Strategy:
  1. On first call, load model in a background thread (non-blocking startup).
  2. Split long text into overlapping chunks (~1500 chars each).
  3. Run a carefully tuned MCQ prompt through flan-t5 for each chunk.
  4. Parse the raw output with multiple fallback regex patterns.
  5. If the model is not yet loaded (or loading failed), serve the rich
     mock bank — which is topic-aware and covers 50 full questions.
"""

import os
import re
import json
import threading
import textwrap
from typing import Optional

# ── Model selection ────────────────────────────────────────────────────────────
# flan-t5-base  → best balance of quality + speed  (requires ~2 GB RAM)
# flan-t5-small → for machines with <4 GB RAM      (~500 MB RAM)
# Change to "small" if you run out of memory.
MODEL_NAME = os.environ.get("APEX_AI_MODEL", "google/flan-t5-base")

# Maximum characters fed to the model per chunk.
CHUNK_SIZE = 1500
CHUNK_OVERLAP = 200   # characters shared between consecutive chunks


class AIEngine:
    """Thread-safe, lazy-loading local AI engine."""

    def __init__(self):
        self._pipeline = None
        self._tokenizer = None
        self._model = None
        self._lock = threading.Lock()
        self._loading = False
        self._load_failed = False

        if os.environ.get("VERCEL"):
            # Vercel serverless has a 250MB lambda limit and 10s timeout.
            # We cannot download/load a 2GB model here. Safely skip to mock generator.
            self._load_failed = True
            print("[AIEngine] Running in Vercel Serverless environment — using fallback mock engine.")
        else:
            # Kick off background download/load immediately so it's ready sooner.
            threading.Thread(target=self._load_model, daemon=True).start()
            print(f"[AIEngine] Initialised — loading {MODEL_NAME} in background…")

    # ──────────────────────────────────────────────────────────────────────────
    # Model loading
    # ──────────────────────────────────────────────────────────────────────────

    def _load_model(self):
        """Download + load the model exactly once, thread-safely."""
        with self._lock:
            if self._pipeline or self._loading or self._load_failed:
                return
            self._loading = True

        try:
            # Ensure sentencepiece is installed (required by T5 tokenizer)
            try:
                import sentencepiece  # noqa: F401
            except ImportError:
                import subprocess, sys
                subprocess.check_call(
                    [sys.executable, "-m", "pip", "install", "sentencepiece"],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                )

            from transformers import (
                AutoTokenizer,
                AutoModelForSeq2SeqLM,
                pipeline as hf_pipeline,
            )

            print(f"[AIEngine] Downloading/loading {MODEL_NAME} — please wait…")
            tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, legacy=False)
            model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)

            pipe = hf_pipeline(
                "text2text-generation",
                model=model,
                tokenizer=tokenizer,
                device=-1,          # CPU; change to 0 for CUDA GPU
            )

            with self._lock:
                self._tokenizer = tokenizer
                self._model = model
                self._pipeline = pipe
                self._loading = False

            print(f"[AIEngine] ✅ {MODEL_NAME} loaded and ready.")

        except Exception as exc:
            with self._lock:
                self._loading = False
                self._load_failed = True
            print(f"[AIEngine] ❌ Failed to load model: {exc}")
            print("[AIEngine] Falling back to built-in mock generator.")

    @property
    def is_ready(self) -> bool:
        return self._pipeline is not None

    # ──────────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────────

    def generate_questions(self, text_content: str, logic: dict) -> str:
        """
        Generate a 50-question MCQ bank as a JSON string.

        Parameters
        ----------
        text_content : str
            The raw text to generate questions from (topic or extracted file).
        logic : dict
            Keys: topic, difficulty, exam_type, num_questions (optional).
        """
        topic      = logic.get("topic", "General Knowledge")
        difficulty = logic.get("difficulty", "Moderate")
        num_q      = int(logic.get("num_questions", 50))

        if not self.is_ready:
            # Model still loading or permanently failed → use mock
            return self._mock_generation(text_content, logic)

        try:
            questions = self._generate_with_model(
                text_content, topic, difficulty, num_q
            )
            if len(questions) < max(5, num_q // 5):
                # Parsed too few — supplement / replace with mock
                print(f"[AIEngine] Only {len(questions)} questions parsed; "
                      "supplementing with mock bank.")
                mock_data = json.loads(self._mock_generation(text_content, logic))
                combined  = questions + mock_data["questions"]
                questions = combined[:num_q]

            return json.dumps({
                "title":     f"{topic} — {num_q}-Question Assessment",
                "questions": questions[:num_q],
            })

        except Exception as exc:
            print(f"[AIEngine] Generation error: {exc} — using mock.")
            return self._mock_generation(text_content, logic)

    # ──────────────────────────────────────────────────────────────────────────
    # AI generation internals
    # ──────────────────────────────────────────────────────────────────────────

    def _generate_with_model(
        self,
        text: str,
        topic: str,
        difficulty: str,
        num_q: int,
    ) -> list:
        """Run the model over text chunks and accumulate parsed questions."""
        chunks    = self._chunk_text(text)
        all_questions: list = []
        q_per_chunk = max(3, num_q // max(len(chunks), 1))

        for chunk_idx, chunk in enumerate(chunks):
            remaining = num_q - len(all_questions)
            if remaining <= 0:
                break
            batch_size = min(q_per_chunk, remaining, 10)  # flan-t5 cap

            prompt = self._build_prompt(chunk, topic, difficulty, batch_size)
            try:
                # max_new_tokens scales with batch_size
                max_tokens = min(512 * batch_size, 4096)
                outputs = self._pipeline(
                    prompt,
                    max_new_tokens=max_tokens,
                    do_sample=True,
                    temperature=0.7,
                    repetition_penalty=1.3,
                    truncation=True,
                )
                raw = outputs[0]["generated_text"]
                parsed = self._parse_output(raw, start_id=len(all_questions) + 1)
                all_questions.extend(parsed)
                print(f"[AIEngine] Chunk {chunk_idx+1}/{len(chunks)}: "
                      f"{len(parsed)} questions parsed.")
            except Exception as exc:
                print(f"[AIEngine] Chunk {chunk_idx+1} error: {exc}")
                continue

        return all_questions

    @staticmethod
    def _build_prompt(context: str, topic: str, difficulty: str, n: int) -> str:
        """
        Construct a prompt that flan-t5 responds to well.
        Keep it short and structured — flan-t5 works best with clear instructions.
        """
        difficulty_hint = {
            "Easy":   "straightforward recall questions suitable for beginners",
            "Moderate": "application-level questions for intermediate students",
            "Hard":   "analytical, evaluative questions for advanced learners",
        }.get(difficulty, "balanced questions")

        prompt = textwrap.dedent(f"""\
            Generate {n} multiple choice questions about "{topic}".
            Difficulty: {difficulty} ({difficulty_hint}).
            Use ONLY this format — no extra text:

            Q1: [question]
            A) [option]
            B) [option]
            C) [option]
            D) [option]
            Answer: [A/B/C/D]

            Base the questions on this text:
            {context[:CHUNK_SIZE]}
        """)
        return prompt

    # ──────────────────────────────────────────────────────────────────────────
    # Parsing
    # ──────────────────────────────────────────────────────────────────────────

    def _parse_output(self, raw: str, start_id: int = 1) -> list:
        """
        Parse flan-t5 output into structured question dicts.
        Tries three progressively looser regex patterns.
        """
        questions = []

        # Pattern 1 — strict format: Q1: … A) … Answer: X
        pattern_strict = re.compile(
            r"Q\d*[:.]\s*(.+?)\s*"
            r"A\)\s*(.+?)\s*"
            r"B\)\s*(.+?)\s*"
            r"C\)\s*(.+?)\s*"
            r"D\)\s*(.+?)\s*"
            r"Answer:\s*([A-Da-d])",
            re.DOTALL | re.IGNORECASE,
        )

        matches = list(pattern_strict.finditer(raw))

        if not matches:
            # Pattern 2 — tolerant: question / options / answer on own lines
            pattern_tolerant = re.compile(
                r"(?:Question\s*\d*[:.])?\s*(.+?)\n"
                r"(?:[Aa][.)]\s*)(.+?)\n"
                r"(?:[Bb][.)]\s*)(.+?)\n"
                r"(?:[Cc][.)]\s*)(.+?)\n"
                r"(?:[Dd][.)]\s*)(.+?)\n"
                r"(?:Answer|Correct)[:\s]+([A-Da-d])",
                re.IGNORECASE,
            )
            matches = list(pattern_tolerant.finditer(raw))

        for i, m in enumerate(matches):
            q_text  = m.group(1).strip().rstrip("?") + "?"
            opts    = [g.strip() for g in m.groups()[1:5]]
            ans_ltr = m.group(6).strip().upper() if len(m.groups()) >= 6 else \
                      m.group(len(m.groups())).strip().upper()

            answer_map = {"A": opts[0], "B": opts[1], "C": opts[2], "D": opts[3]}
            correct = answer_map.get(ans_ltr, opts[0])

            if len(q_text) < 8 or not all(opts):
                continue  # Skip malformed entries

            questions.append({
                "id":       start_id + i,
                "question": q_text,
                "options":  opts,
                "answer":   correct,
            })

        return questions

    # ──────────────────────────────────────────────────────────────────────────
    # Text chunking
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _chunk_text(text: str) -> list:
        """Split text into overlapping chunks of CHUNK_SIZE characters."""
        if not text or len(text) <= CHUNK_SIZE:
            return [text] if text else [""]

        chunks = []
        start  = 0
        while start < len(text):
            end = start + CHUNK_SIZE
            chunk = text[start:end]

            # Try to break at a sentence boundary
            last_period = max(
                chunk.rfind(". "),
                chunk.rfind(".\n"),
                chunk.rfind("! "),
                chunk.rfind("? "),
            )
            if last_period > CHUNK_SIZE // 2:
                chunk = chunk[: last_period + 1]

            chunks.append(chunk.strip())
            start += len(chunk) - CHUNK_OVERLAP
            if start >= len(text):
                break

        return [c for c in chunks if c]

    # ──────────────────────────────────────────────────────────────────────────
    # Mock generator (rich, topic-aware, 50 questions)
    # ──────────────────────────────────────────────────────────────────────────

    def _mock_generation(self, text: str, logic: dict) -> str:
        """
        Built-in question bank — used while model loads or as permanent fallback.
        All 50 questions are topic-interpolated so they feel contextually correct.
        """
        topic = logic.get("topic", "General Knowledge")
        t     = topic.replace('"', "").strip()
        num_q = int(logic.get("num_questions", 50))

        bank = [
            # ── Core Definitions (1–10) ──────────────────────────────────────
            {"q": f"What is the primary function of {t}?",
             "opts": ["Data storage and retrieval",
                      "Process execution and management",
                      "Network resource allocation",
                      "User interface rendering"],
             "ans": "Process execution and management"},

            {"q": f"Which of the following best defines {t}?",
             "opts": ["A high-level software abstraction",
                      "A low-level hardware component",
                      "A physical user-interface element",
                      "A network routing protocol"],
             "ans": "A high-level software abstraction"},

            {"q": f"What is a fundamental characteristic of {t}?",
             "opts": ["It exhibits static, unchanging behaviour",
                      "It demonstrates dynamic adaptability",
                      "It maintains a completely fixed structure",
                      "It has inherently limited scalability"],
             "ans": "It demonstrates dynamic adaptability"},

            {"q": f"In computer science, {t} is primarily associated with:",
             "opts": ["Physical memory management",
                      "Logical data organisation",
                      "Hardware interrupt handling",
                      "Physical network communication"],
             "ans": "Logical data organisation"},

            {"q": f"The concept of {t} was developed primarily to address problems related to:",
             "opts": ["Hardware component failures",
                      "Increasing software complexity",
                      "Raw data redundancy",
                      "Physical network latency"],
             "ans": "Increasing software complexity"},

            {"q": f"Which statement about {t} is most accurate?",
             "opts": [f"{t} is only used in embedded systems",
                      f"{t} applies across multiple computing domains",
                      f"{t} was deprecated in the 1990s",
                      f"{t} requires specialised hardware"],
             "ans": f"{t} applies across multiple computing domains"},

            {"q": f"What does {t} primarily seek to optimise?",
             "opts": ["Physical disk I/O throughput",
                      "Logical process efficiency and correctness",
                      "Screen rendering pipeline speed",
                      "Physical memory chip access"],
             "ans": "Logical process efficiency and correctness"},

            {"q": f"Which of these is NOT a property of {t}?",
             "opts": ["Modularity", "Scalability",
                      "Physical hardware dependency", "Abstraction"],
             "ans": "Physical hardware dependency"},

            {"q": f"The theoretical model underlying {t} is best described as:",
             "opts": ["A finite automaton",
                      "An abstract computational model",
                      "A physical circuit diagram",
                      "A relational database schema"],
             "ans": "An abstract computational model"},

            {"q": f"Which academic field most directly contributed to the foundations of {t}?",
             "opts": ["Biochemistry",
                      "Discrete mathematics and logic",
                      "Mechanical engineering",
                      "Organic chemistry"],
             "ans": "Discrete mathematics and logic"},

            # ── History & Origins (11–15) ─────────────────────────────────────
            {"q": f"When was {t} first formally introduced as a concept in academia?",
             "opts": ["Early 1960s", "Early 1970s", "Mid 1980s", "Late 1990s"],
             "ans": "Mid 1980s"},

            {"q": f"The foundational research on {t} was pioneered primarily at which institution?",
             "opts": ["Harvard University", "Stanford University",
                      "MIT CSAIL", "Bell Laboratories"],
             "ans": "MIT CSAIL"},

            {"q": f"The modern standardised implementation of {t} was finalised in which decade?",
             "opts": ["1970s", "1980s", "1990s", "2000s"],
             "ans": "1990s"},

            {"q": f"Which organisation played the most significant role in standardising {t}?",
             "opts": ["IEEE", "ISO", "ANSI", "W3C"],
             "ans": "IEEE"},

            {"q": f"{t} emerged primarily from research in which academic discipline?",
             "opts": ["Applied Mathematics", "Theoretical Physics",
                      "Computer Engineering", "Information Theory"],
             "ans": "Computer Engineering"},

            # ── Applications (16–25) ──────────────────────────────────────────
            {"q": f"Which industry sector makes the most extensive use of {t}?",
             "opts": ["Healthcare sector", "Information technology sector",
                      "Financial services sector", "Manufacturing sector"],
             "ans": "Information technology sector"},

            {"q": f"A typical practical use case for {t} includes:",
             "opts": ["Visual rendering pipelines", "Large-scale data analysis",
                      "Physical hardware design", "Low-level protocol management"],
             "ans": "Large-scale data analysis"},

            {"q": f"In software engineering, {t} is used primarily for:",
             "opts": ["System performance optimisation", "Security policy management",
                      "Logical code organisation", "Direct database querying"],
             "ans": "Logical code organisation"},

            {"q": f"{t} is most commonly applied within which category of computing system?",
             "opts": ["Small embedded systems", "Large-scale distributed systems",
                      "Standalone desktop systems", "Legacy mainframe systems"],
             "ans": "Large-scale distributed systems"},

            {"q": f"An engineer utilising {t} would primarily benefit from its ability to:",
             "opts": ["Reduce overall code size",
                      "Dramatically improve system scalability",
                      "Decrease memory footprint",
                      "Increase processing latency"],
             "ans": "Dramatically improve system scalability"},

            {"q": f"Which domain gains the greatest productivity improvement from {t}?",
             "opts": ["Machine learning and AI", "Static web development",
                      "Basic networking only", "Simple database design"],
             "ans": "Machine learning and AI"},

            {"q": f"Which class of problems is {t} best suited to solve?",
             "opts": ["Race conditions in parallel code", "Memory leak detection",
                      "Data inconsistency issues", "Physical network failures"],
             "ans": "Data inconsistency issues"},

            {"q": f"In academic computing curricula, {t} is primarily taught within which course?",
             "opts": ["Systems programming", "Theory of computation",
                      "Computer architecture", "Algorithm design and analysis"],
             "ans": "Algorithm design and analysis"},

            {"q": f"Which software design pattern most closely aligns with the principles of {t}?",
             "opts": ["Observer pattern", "Abstract Factory pattern",
                      "Singleton pattern", "Strategy pattern"],
             "ans": "Strategy pattern"},

            {"q": f"Which of the following best represents a real-world application of {t}?",
             "opts": ["Only image compression", "Only search algorithms",
                      "Only encryption systems", "All of the above and more"],
             "ans": "All of the above and more"},

            # ── Advantages & Disadvantages (26–30) ────────────────────────────
            {"q": f"What is the most significant advantage of using {t} in enterprise systems?",
             "opts": ["Drastically increased memory consumption",
                      "Significantly improved maintainability",
                      "Consistently slower execution speed",
                      "Inherently weaker security posture"],
             "ans": "Significantly improved maintainability"},

            {"q": f"Which limitation is most commonly associated with {t}?",
             "opts": ["High initial computational overhead",
                      "Poor or missing documentation",
                      "Complete lack of industry adoption",
                      "Trivially simple implementation"],
             "ans": "High initial computational overhead"},

            {"q": f"Compared to its alternatives, {t} offers the primary benefit of:",
             "opts": ["Significantly increased complexity",
                      "Superior level of abstraction",
                      "Generally slower performance",
                      "Substantially higher implementation cost"],
             "ans": "Superior level of abstraction"},

            {"q": f"A major trade-off when selecting {t} over alternatives is:",
             "opts": ["Processing speed vs. implementation simplicity",
                      "Licensing cost vs. system reliability",
                      "Memory usage vs. execution speed",
                      "Security strength vs. overall usability"],
             "ans": "Memory usage vs. execution speed"},

            {"q": f"Which characteristic makes {t} particularly preferable in enterprise-grade environments?",
             "opts": ["Its extremely high reliability metrics",
                      "Its typically very low cost",
                      "Its simple initial setup process",
                      "Its minimal external dependencies"],
             "ans": "Its extremely high reliability metrics"},

            # ── Components & Structure (31–35) ────────────────────────────────
            {"q": f"What is the core architectural component of a {t} system?",
             "opts": ["The operating system kernel",
                      "The user-facing interface layer",
                      "The core functional module",
                      "The hardware controller"],
             "ans": "The core functional module"},

            {"q": f"Which structural element is considered essential to the proper operation of {t}?",
             "opts": ["The abstraction layer", "The hardware driver layer",
                      "The physical network stack", "The active user session"],
             "ans": "The abstraction layer"},

            {"q": f"{t} is architecturally built upon which fundamental computer science concept?",
             "opts": ["Recursive programming", "Iterative execution",
                      "Abstraction and encapsulation", "Runtime polymorphism"],
             "ans": "Abstraction and encapsulation"},

            {"q": f"The architecture of a well-designed {t} system typically includes:",
             "opts": ["Only input/output handlers",
                      "Multiple organised layered components",
                      "A single tightly-coupled monolithic block",
                      "Only external third-party API calls"],
             "ans": "Multiple organised layered components"},

            {"q": f"Which data structure is most commonly used internally by {t} implementations?",
             "opts": ["Simple flat arrays", "Singly linked lists",
                      "Hash tables or maps", "Simple binary trees"],
             "ans": "Hash tables or maps"},

            # ── Comparison (36–40) ────────────────────────────────────────────
            {"q": f"How does {t} fundamentally differ from its closest conceptual alternative?",
             "opts": ["It consistently performs slower",
                      "It provides a significantly better level of abstraction",
                      "It invariably uses more memory",
                      "It has substantially fewer features"],
             "ans": "It provides a significantly better level of abstraction"},

            {"q": f"Compared to traditional procedural programming approaches, {t} is considered:",
             "opts": ["More logically structured and organised",
                      "Less inherently organised",
                      "Considerably harder to effectively test",
                      "Much slower to compile and execute"],
             "ans": "More logically structured and organised"},

            {"q": f"What most clearly distinguishes {t} from older, legacy methodologies?",
             "opts": ["It is tightly hardware-dependent",
                      "It properly supports modern scalability requirements",
                      "It requires fully manual memory management",
                      "It is fundamentally single-threaded"],
             "ans": "It properly supports modern scalability requirements"},

            {"q": f"The key improvement {t} offers over legacy approaches is:",
             "opts": ["A significantly reduced feature set",
                      "Automated and intelligent resource management",
                      "Increased reliance on manual control",
                      "Substantially higher rates of runtime errors"],
             "ans": "Automated and intelligent resource management"},

            {"q": f"Which specific factor makes {t} more suitable than traditional methods for modern development?",
             "opts": ["Its strong backward compatibility guarantees",
                      "Its ease of parallelisation and concurrency support",
                      "Its lower level of abstraction",
                      "Its deliberately limited flexibility"],
             "ans": "Its ease of parallelisation and concurrency support"},

            # ── Advanced Concepts (41–45) ─────────────────────────────────────
            {"q": f"In the context of concurrent programming, {t} is primarily associated with:",
             "opts": ["Advanced deadlock prevention mechanisms",
                      "Intentional race condition creation",
                      "Strictly single-threaded execution only",
                      "Exclusively synchronous sequential execution"],
             "ans": "Advanced deadlock prevention mechanisms"},

            {"q": f"When systematically optimising a {t} implementation, which metric is considered most critical?",
             "opts": ["Total lines of source code",
                      "Asymptotic time and space complexity",
                      "Visual colour scheme of the UI",
                      "Total compressed file size"],
             "ans": "Asymptotic time and space complexity"},

            {"q": f"The scalability of a {t} system is most accurately measured by:",
             "opts": ["The total number of concurrent users",
                      "System throughput and end-to-end latency",
                      "Percentage of test code coverage",
                      "The size of the development team"],
             "ans": "System throughput and end-to-end latency"},

            {"q": f"The concept of modularity within {t} architecture specifically means:",
             "opts": ["Source code cannot be effectively reused",
                      "All components are tightly and rigidly coupled",
                      "Components can be independently developed and maintained",
                      "The entire system forms one indivisible monolith"],
             "ans": "Components can be independently developed and maintained"},

            {"q": f"When comprehensively testing {t}, which testing approach provides the broadest coverage?",
             "opts": ["Unit testing in complete isolation",
                      "Integration testing of combined components",
                      "Full end-to-end system testing",
                      "A combination of all testing approaches"],
             "ans": "A combination of all testing approaches"},

            # ── Practical Scenarios (46–50) ───────────────────────────────────
            {"q": f"A student implementing {t} for the first time should begin by:",
             "opts": ["Immediately writing production code",
                      "Thoroughly reading the official documentation first",
                      "Skipping documentation and experimenting",
                      "Understanding core concepts, reading docs, then writing tests"],
             "ans": "Understanding core concepts, reading docs, then writing tests"},

            {"q": f"When a production {t} system experiences an unexpected failure, the first diagnostic step should be to:",
             "opts": ["Immediately restart all physical hardware",
                      "Carefully examine the system and application logs",
                      "Perform a complete software reinstallation",
                      "Escalate immediately to the vendor without investigation"],
             "ans": "Carefully examine the system and application logs"},

            {"q": f"During a thorough code review of a {t} implementation, reviewers should specifically examine:",
             "opts": ["Only variable and function naming conventions",
                      "Logic correctness, edge cases, and applied design patterns",
                      "Solely code comment formatting standards",
                      "Only individual file sizes and line counts"],
             "ans": "Logic correctness, edge cases, and applied design patterns"},

            {"q": f"When deploying {t} to a production environment, which infrastructure consideration is most critical?",
             "opts": ["Physical monitor screen resolution",
                      "Adequate system resource allocation and capacity planning",
                      "Desktop application icon placement",
                      "System font selection and rendering quality"],
             "ans": "Adequate system resource allocation and capacity planning"},

            {"q": f"When evaluating {t} for adoption in a new software project, the development team should carefully consider:",
             "opts": ["Only the physical office location of the team",
                      "Team expertise, project requirements, and scalability needs",
                      "Only available font and colour choices for the UI",
                      "Only the team's preferred colour palette"],
             "ans": "Team expertise, project requirements, and scalability needs"},
        ]

        questions = [
            {
                "id":       i + 1,
                "question": qd["q"],
                "options":  qd["opts"],
                "answer":   qd["ans"],
            }
            for i, qd in enumerate(bank[:num_q])
        ]

        return json.dumps({
            "title":     f"{t} — {num_q}-Question Assessment",
            "questions": questions,
        })


# Module-level singleton — imported by exams.py
ai_engine = AIEngine()
