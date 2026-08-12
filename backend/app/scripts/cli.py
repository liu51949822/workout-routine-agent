"""Command-line interface (CLI) for the Workout Routine Agent.

This preserves the original interactive session behaviour of `workout_agent.py`
so the agent can still be used without the mobile app or HTTP API.

Run from the `backend` directory:
    python -m app.scripts.cli
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# Allow `python -m app.scripts.cli` to resolve the `app` package.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import config  # noqa: E402
from app.agent import create_workout_agent  # noqa: E402

logging.basicConfig(level=logging.INFO)


def run_interactive_session(agent) -> None:
    """Run the interactive chat loop (mirrors the original CLI)."""
    print("\n" + "=" * 60)
    print("Workout Routine Agent - Interactive Mode")
    print("=" * 60)
    print("\nI can help you create personalized workout routines based on")
    print("your exercise data, research papers, and personal notes.")
    print("\nExample queries:")
    print("  - Give me a 10-minute workout focusing on core strength")
    print("  - Create a 20-minute leg workout incorporating squat research")
    print("  - Design a quick cardio routine for limited time")
    print("\nType 'quit' or 'exit' to end the session.\n")

    while True:
        try:
            user_input = input("\nYou: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["quit", "exit", "q"]:
                print("\nGoodbye! Stay active!")
                break
            result = agent.invoke({"messages": [{"role": "user", "content": user_input}]})
            reply = result["messages"][-1].content
            print("\n" + "-" * 40)
            print("Agent Response:")
            print("-" * 40)
            print(reply)
        except KeyboardInterrupt:
            print("\n\nSession interrupted. Goodbye!")
            break
        except Exception as exc:  # pragma: no cover
            print(f"\nError: {exc}")


def main() -> None:
    if not config.OPENAI_API_KEY:
        print("Error: OPENAI_API_KEY environment variable not set.")
        print("Set it with: export OPENAI_API_KEY='your-key-here'")
        return

    print("=" * 60)
    print("Setting up Workout Routine Agent")
    print("=" * 60)

    try:
        print("\n[1/3] Loading/restoring knowledge base...")
        agent = create_workout_agent()
        print("[2/3] Agent ready.")
    except Exception as exc:
        print(f"Error during setup: {exc}")
        return

    print("[3/3] Starting interactive session.")
    run_interactive_session(agent)


if __name__ == "__main__":
    main()
