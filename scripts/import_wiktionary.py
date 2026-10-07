#!/usr/bin/env python3
"""
Vocab Vault — Wiktionary Dump & Reference Importer (scripts/import_wiktionary.py)
ステップ3: Wiktionaryデータの抽出・Supabase/JSONへの取り込みスクリプト

利用例:
  # Kaikki.org (Wiktextract) の JSONL ファイルから取り込む場合:
  python3 scripts/import_wiktionary.py --file kaikki.org-dictionary-English.jsonl --lang en

  # 重要語リストからAPI経由で一括収集してキャッシュテーブルに投入する場合:
  python3 scripts/import_wiktionary.py --words "state,nation,power,society,liberty" --lang en
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.parse
from typing import List, Dict, Any, Optional

WIKT_HOSTS = {
    'en': 'en.wiktionary.org',
    'fr': 'fr.wiktionary.org',
    'de': 'de.wiktionary.org'
}

def clean_ipa(raw_ipa: str) -> str:
    if not raw_ipa:
        return ""
    return raw_ipa.strip("[]/ \t\n\r")

def fetch_wiktionary_api(word: str, lang: str) -> Optional[Dict[str, Any]]:
    host = WIKT_HOSTS.get(lang, 'en.wiktionary.org')
    title = urllib.parse.quote(word.strip())
    url = f"https://{host}/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&titles={title}&format=json"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'VocabVault-Importer/1.0 (contact: info@vocabvault.app)'})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            page = next(iter(pages.values()), None)
            if not page or 'missing' in page or not page.get('extract'):
                return None
            extract = page['extract']
            source_url = f"https://{host}/wiki/{title}"
            return {
                'lang': lang,
                'word': word,
                'clean_ipa': '', # APIテキストから抽出可能
                'section_extract': extract[:1500],
                'source_url': source_url
            }
    except Exception as e:
        print(f"[Warn] API Fetch failed for {word}: {e}", file=sys.stderr)
        return None

def parse_kaikki_jsonl(filepath: str, target_lang: str, limit: int = 50000) -> List[Dict[str, Any]]:
    """Kaikki.org の Wiktextract JSONL 形式をパース"""
    results = []
    print(f"[*] Parsing Kaikki dump: {filepath} for language: {target_lang}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        count = 0
        for line in f:
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
                word = entry.get('word', '').strip()
                if not word or '/' in word:
                    continue
                
                # IPAの抽出
                ipa = ""
                for snd in entry.get('sounds', []):
                    if 'ipa' in snd:
                        ipa = clean_ipa(snd['ipa'])
                        if ipa:
                            break
                
                # 語源テキストの抽出
                ety_text = entry.get('etymology_text', '')
                if not ety_text and entry.get('etymology_texts'):
                    ety_text = " ".join(entry['etymology_texts'])
                
                host = WIKT_HOSTS.get(target_lang, 'en.wiktionary.org')
                source_url = f"https://{host}/wiki/{urllib.parse.quote(word)}"
                
                results.append({
                    'lang': target_lang,
                    'word': word,
                    'clean_ipa': ipa,
                    'section_extract': (ety_text[:1200] if ety_text else f"{word} definitions").strip(),
                    'source_url': source_url
                })
                count += 1
                if count >= limit:
                    break
            except Exception:
                continue
    
    print(f"[+] Successfully parsed {len(results)} entries.")
    return results

def upload_to_supabase(records: List[Dict[str, Any]], supabase_url: str, supabase_key: str, batch_size: int = 100):
    if not supabase_url or not supabase_key:
        print("[!] Supabase URL or Key missing. Outputting to wiktionary_dump.json instead.")
        with open("wiktionary_dump.json", "w", encoding="utf-8") as out:
            json.dump(records, out, ensure_ascii=False, indent=2)
        print("[+] Saved to wiktionary_dump.json")
        return

    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/wiktionary_references"
    headers = {
        'apikey': supabase_key,
        'Authorization': f"Bearer {supabase_key}",
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }

    print(f"[*] Uploading {len(records)} entries to Supabase in batches of {batch_size}...")
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        req = urllib.request.Request(endpoint, data=json.dumps(batch).encode('utf-8'), headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                if res.status in (200, 201):
                    print(f"  - Progress: {i + len(batch)}/{len(records)} inserted.")
        except Exception as e:
            print(f"[!] Upload batch error: {e}", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(description="Wiktionary Dump and Reference Importer")
    parser.add_argument("--file", help="Path to Kaikki.org JSONL file")
    parser.add_argument("--words", help="Comma-separated word list to fetch via API")
    parser.add_argument("--lang", default="en", choices=["en", "fr", "de"], help="Target language")
    parser.add_argument("--limit", type=int, default=10000, help="Max entries to process")
    parser.add_argument("--supabase-url", default=os.environ.get("SUPABASE_URL", ""), help="Supabase project URL")
    parser.add_argument("--supabase-key", default=os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""), help="Supabase Service Role Key")

    args = parser.parse_args()

    records = []
    if args.file:
        records = parse_kaikki_jsonl(args.file, args.lang, args.limit)
    elif args.words:
        word_list = [w.strip() for w in args.words.split(',') if w.strip()]
        for w in word_list:
            item = fetch_wiktionary_api(w, args.lang)
            if item:
                records.append(item)
    else:
        print("[!] Please specify --file <path> or --words <w1,w2,...>")
        sys.exit(1)

    upload_to_supabase(records, args.supabase_url, args.supabase_key)

if __name__ == "__main__":
    main()
