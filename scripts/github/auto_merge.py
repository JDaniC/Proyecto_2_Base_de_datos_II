"""Verifica el check nativo de CodeRabbit y solicita auto-merge sin ejecutar código del PR."""
import json
import os
from pathlib import Path
import re
import subprocess

APP_ID = 347564
CONTEXT = "revision-coderabbit"


def verdict(checks, sha):
    trusted = [c for c in checks if c.get("name") == "CodeRabbit"
               and (c.get("app") or {}).get("id") == APP_ID
               and c.get("head_sha") == sha]
    if not trusted:
        return "pending", "Esperando CodeRabbit para el commit actual"
    check = max(trusted, key=lambda c: c.get("id", 0))
    if check.get("status") != "completed":
        return "pending", "Revisión de CodeRabbit en curso"
    if check.get("conclusion") != "success":
        return "failure", "CodeRabbit no aprobó el commit actual"
    return "success", "CodeRabbit completó el control del commit actual"


def eligible(pr, repository):
    return (pr.get("state") == "open" and not pr.get("draft")
            and pr.get("base", {}).get("ref") in {"develop", "main"}
            and pr.get("head", {}).get("repo", {}).get("full_name") == repository)


def gh_api(endpoint, data=None):
    args = ["gh", "api", endpoint]
    if data is not None:
        args += ["--method", "POST", "--input", "-"]
    result = subprocess.run(args, input=json.dumps(data) if data is not None else None,
                            text=True, capture_output=True, check=True)
    return json.loads(result.stdout) if result.stdout.strip() else None


def checks_for(repository, sha):
    checks, page = [], 1
    while True:
        batch = gh_api(f"repos/{repository}/commits/{sha}/check-runs?per_page=100&page={page}")["check_runs"]
        checks.extend(batch)
        if len(batch) < 100:
            return checks
        page += 1


def candidate_numbers(event, repository):
    if "check_run" in event:
        return [pr["number"] for pr in event["check_run"].get("pull_requests", [])]
    if "issue" in event:
        return [event["issue"]["number"]] if "pull_request" in event["issue"] else []
    number = event.get("inputs", {}).get("pr")
    if number:
        if not re.fullmatch(r"[1-9][0-9]*", str(number)):
            raise ValueError("Número de PR inválido")
        return [int(number)]
    numbers, page = [], 1
    while True:
        batch = gh_api(f"repos/{repository}/pulls?state=open&per_page=100&page={page}")
        numbers.extend(pr["number"] for pr in batch)
        if len(batch) < 100:
            return numbers
        page += 1


def process(repository, number):
    pr = gh_api(f"repos/{repository}/pulls/{number}")
    if not eligible(pr, repository):
        print(f"PR #{number}: no elegible (cerrado, borrador, fork o destino distinto)")
        return
    sha = pr["head"]["sha"]
    state, description = verdict(checks_for(repository, sha), sha)
    # Confirmar que no cambió la cabeza entre lectura y publicación del estado.
    current = gh_api(f"repos/{repository}/pulls/{number}")
    if not eligible(current, repository) or current["head"]["sha"] != sha:
        print(f"PR #{number}: cambió durante la lectura; se evaluará en el siguiente evento")
        return
    gh_api(f"repos/{repository}/statuses/{sha}", {
        "state": state, "context": CONTEXT, "description": description,
        "target_url": pr["html_url"],
    })
    print(f"PR #{number}, {sha[:7]}: {state}: {description}")
    if state != "success":
        return
    # GitHub conserva contrato-pr, CodeRabbit y las demás reglas.
    # Solo se solicita integración después del resultado limpio actual.
    subprocess.run(["gh", "pr", "merge", str(number), "--repo", repository,
                    "--auto", "--squash", "--match-head-commit", sha], check=True)


def main():
    repository = os.environ["GITHUB_REPOSITORY"]
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    for number in candidate_numbers(event, repository):
        process(repository, number)


if __name__ == "__main__":
    main()
