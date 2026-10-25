"""Verifica el resumen nativo de Codex y solicita auto-merge sin ejecutar código del PR."""
import json
import os
from pathlib import Path
import re
import subprocess

BOT = "chatgpt-codex-connector[bot]"
APP_ID = 1144995
CONTEXT = "revision-codex"


def verdict(comments, sha):
    trusted = [c for c in comments if c.get("user", {}).get("login") == BOT
               and c.get("user", {}).get("type") == "Bot"
               and (c.get("performed_via_github_app") or {}).get("id") == APP_ID
               and "<!-- codex-pull-request-review-summary -->" in c.get("body", "")]
    if not trusted:
        return "pending", "Esperando resumen de revisión de Codex"
    comment = max(trusted, key=lambda c: (c.get("updated_at", ""), c.get("id", 0)))
    match = re.search(r"<!-- codex-review-state:v1\s+(\{.*?\})\s*-->", comment["body"], re.S)
    try:
        review = json.loads(match[1])["code_review"] if match else None
    except (ValueError, KeyError, TypeError):
        review = None
    if not isinstance(review, dict):
        return "pending", "Resumen de Codex no reconocido; no se presume aprobado"
    if review.get("commit_sha") != sha:
        return "pending", "Codex debe revisar el commit actual"
    if not isinstance(review.get("status"), str):
        return "pending", "Estado de Codex no reconocido"
    if review.get("status") in {"failed", "cancelled", "error"}:
        return "failure", "La revisión de Codex no terminó correctamente"
    if review.get("status") != "completed":
        return "pending", "Revisión de Codex en curso"
    if review.get("has_any_findings") is True or review.get("has_unresolved_findings") is True:
        return "failure", "Codex encontró observaciones; corregir y solicitar nueva revisión"
    if review.get("has_any_findings") is not False or review.get("has_unresolved_findings") is not False:
        return "pending", "Codex no informó un resultado concluyente"
    return "success", "Codex revisó este commit sin hallazgos"


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


def comments_for(repository, number):
    comments, page = [], 1
    while True:
        batch = gh_api(f"repos/{repository}/issues/{number}/comments?per_page=100&page={page}")
        comments.extend(batch)
        if len(batch) < 100:
            return comments
        page += 1


def candidate_numbers(event, repository):
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
    state, description = verdict(comments_for(repository, number), sha)
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
    # GitHub conserva contrato-pr, revision-codex y las demás reglas.
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
