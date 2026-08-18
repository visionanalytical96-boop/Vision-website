"""Integration layer between the existing vision-ai-content engine and the
vision_ai skill modules.

Nothing here replaces the engine: it answers the questions the engine used to
answer with random.choice(), and finishes the job the engine could not (proper
reel, validation, history, delivery through the existing sync chain).
"""

__version__ = "1.0.0"
