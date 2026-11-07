"""Verifica el check y la aprobación de CodeRabbit sin ejecutar código del PR."""
from collections import Counter
import json
import os
from pathlib import Path
import re
import subprocess

APP_ID = 347564
REVIEWER_ID = 136622811
CONTEXT = "revision-coderabbit"


def verdict(checks, reviews, sha):
    trusted = [c for c in checks if c.get("name") == "CodeRabbit"
               and (c.get("app") or {}).get("id") == APP_ID
               and c.get("head_sha") == sha]
    if not trusted:
        return "pending", "Esperando CodeRabbit para el commit actual"
    check = max(trusted, key=lambda c: c.get("id", 0))
    if check.get("status") != "completed":
        return "pending", "Revisión de CodeRabbit en curso"
    if check.get("conclusion") != "success":
        return "failure", "El check nativo de CodeRabbit no pasó"
    opinions = [r for r in reviews if (r.get("user") or {}).get("id") == REVIEWER_ID
                and r.get("state") in {"APPROVED", "CHANGES_REQUESTED", "DISMISSED"}]
    # GitHub devuelve las revisiones en orden cronológico.
    latest = opinions[-1] if opinions else {}
    if latest.get("commit_id") != sha or latest.get("state") == "DISMISSED":
        return "pending", "Esperando aprobación de CodeRabbit para el commit actual"
    if latest["state"] == "CHANGES_REQUESTED":
        return "failure", "CodeRabbit solicitó cambios en el commit actual"
    return "success", "CodeRabbit aprobó el commit actual"


def eligible(pr, repository):
    return (pr.get("state") == "open" and not pr.get("draft")
            and pr.get("base", {}).get("ref") in {"develop", "main"}
            and pr.get("head", {}).get("repo", {}).get("full_name") == repository)


def gh_api(endpoint, data=None, *, paginate=False):
    args = ["gh", "api", endpoint]
    if paginate:
        args += ["--paginate", "--slurp"]
    if data is not None:
        args += ["--method", "POST", "--input", "-"]
    result = subprocess.run(args, input=json.dumps(data) if data is not None else None,
                            text=True, capture_output=True, check=True)
    return json.loads(result.stdout) if result.stdout.strip() else None


def checks_for(repository, sha):
    checks, page = [], 1
    while True:
        batch = gh_api(f"repos/{repository}/commits/{sha}/check-runs?filter=all&per_page=100&page={page}")["check_runs"]
        checks.extend(batch)
        if len(batch) < 100:
            return checks
        page += 1


def candidates(event, repository):
    number = event.get("inputs", {}).get("pr")
    if number and not re.fullmatch(r"[1-9][0-9]*", str(number)):
        raise ValueError("Número de PR inválido")
    pages = gh_api(f"repos/{repository}/pulls?state=open&per_page=100", paginate=True)
    pull_requests = [pr for page in pages for pr in page if eligible(pr, repository)]
    if number:
        pull_requests.sort(key=lambda pr: pr["number"] != int(number))
    return pull_requests


def process(repository, number, shared_heads=()):
    pr = gh_api(f"repos/{repository}/pulls/{number}")
    if not eligible(pr, repository):
        print(f"PR #{number}: no elegible (cerrado, borrador, fork o destino distinto)")
        return
    sha = pr["head"]["sha"]
    if sha in shared_heads:
        state, description = "pending", "El commit está compartido por varios PR abiertos"
    else:
        checks = checks_for(repository, sha)
        pages = gh_api(f"repos/{repository}/pulls/{number}/reviews?per_page=100", paginate=True)
        reviews = [review for page in pages for review in page]
        state, description = verdict(checks, reviews, sha)
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
    merge = ["gh", "pr", "merge", str(number), "--repo", repository]
    if state != "success":
        if current.get("auto_merge"):
            subprocess.run(merge + ["--disable-auto"], check=True)
        return
    # GitHub conserva los checks requeridos y la resolución de conversaciones.
    subprocess.run(merge + ["--auto", "--squash", "--match-head-commit", sha], check=True)


def main():
    repository = os.environ["GITHUB_REPOSITORY"]
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    pull_requests = candidates(event, repository)
    # El estado requerido de GitHub se comparte entre los PR del mismo SHA.
    head_counts = Counter(pr["head"]["sha"] for pr in pull_requests)
    shared_heads = {sha for sha, count in head_counts.items() if count > 1}
    for pr in pull_requests:
        process(repository, pr["number"], shared_heads)


if __name__ == "__main__":
    main()
