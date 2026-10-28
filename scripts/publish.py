#!/usr/bin/env python3
"""Mirror the committed files to GitHub through the Composio GitHub connection (no local git credentials needed)."""
import base64
import json
import pathlib
import subprocess
import sys
import tempfile

OWNER, REPO, BRANCH = 'davideditsvfx', 'lift', 'main'
ROOT = pathlib.Path(__file__).resolve().parent.parent
API = f'https://api.github.com/repos/{OWNER}/{REPO}'


def gh(method, url, body=None):
    args = ['composio', 'proxy', url, '--toolkit', 'github', '-X', method]
    if body is not None:
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
            json.dump(body, f)
        args += ['-H', 'content-type: application/json', '-d', '@' + f.name]
    for attempt in range(3):
        try:
            out = subprocess.run(args, capture_output=True, text=True, stdin=subprocess.DEVNULL, timeout=60)
            break
        except subprocess.TimeoutExpired:
            print(f'  {method} timed out, retrying ({attempt + 1}/3)')
    else:
        sys.exit(f'{method} {url} kept timing out')
    try:
        data = json.loads(out.stdout)
    except json.JSONDecodeError:
        sys.exit(f'{method} {url} failed:\n{out.stdout[:500]}\n{out.stderr[:500]}')
    if isinstance(data, dict) and 'message' in data and str(data.get('status', '')).startswith(('4', '5')):
        sys.exit(f'{method} {url}: {data["message"]}')
    return data


def git(*a):
    return subprocess.run(['git', '-C', str(ROOT), *a], capture_output=True, text=True, check=True).stdout


def main():
    if git('status', '--porcelain').strip():
        sys.exit('Commit your changes first; only committed files are published.')
    files = git('ls-files').split()
    parent = gh('GET', f'{API}/git/ref/heads/{BRANCH}')['object']['sha']
    tree = []
    for path in files:
        content = base64.b64encode((ROOT / path).read_bytes()).decode()
        blob = gh('POST', f'{API}/git/blobs', {'content': content, 'encoding': 'base64'})
        tree.append({'path': path, 'mode': '100644', 'type': 'blob', 'sha': blob['sha']})
        print('uploaded', path)
    tree_sha = gh('POST', f'{API}/git/trees', {'tree': tree})['sha']
    commit = gh('POST', f'{API}/git/commits', {'message': git('log', '-1', '--format=%B').strip(), 'tree': tree_sha, 'parents': [parent]})
    gh('PATCH', f'{API}/git/refs/heads/{BRANCH}', {'sha': commit['sha']})
    print('published', commit['sha'][:7], f'-> https://{OWNER}.github.io/{REPO}/')


if __name__ == '__main__':
    main()
