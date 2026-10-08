#!/usr/bin/env python3
"""
daily_etymology_bot.py
Selects a Proto-Indo-European (PIE) root from VocabVault starter pack,
formats a high-engagement viral post, and outputs both a Markdown summary
and optional Twitter API broadcast.
"""

import os
import json
import random
import datetime

# High-yield PIE roots for daily viral dissemination
ROOTS = [
    {
        "root": "*bʰer-",
        "meaning": "運ぶ、耐える、生み出す",
        "words": [
            ("bear", "耐える、運ぶ、産む"),
            ("bring", "持ってくる"),
            ("differ", "dis(離れて) + fer(運ぶ) ＝ 異なる"),
            ("prefer", "pre(前に) + fer(運ぶ) ＝ 好む"),
            ("transfer", "trans(越えて) + fer(運ぶ) ＝ 移動する"),
            ("infer", "in(中に) + fer(運ぶ) ＝ 推論する"),
        ],
        "insight": "英語の『fer』『bear』『bring』はすべて数千年前の同一祖語 *bʰer- から枝分かれした血縁単語です。"
    },
    {
        "root": "*kred-dʰē-",
        "meaning": "心臓を置く、信じる",
        "words": [
            ("credit", "信用、債権"),
            ("creed", "信条、教義"),
            ("incredible", "信じられない"),
            ("credulous", "騙されやすい"),
            ("grant", "認める、与える（古フランス語経由）"),
        ],
        "insight": "古代人にとって『信じる』とは『自分の心臓(kred)を相手に預ける(dhe)』ことでした。"
    },
    {
        "root": "*sta-",
        "meaning": "立つ、確固たるものにする",
        "words": [
            ("stand", "立つ"),
            ("state", "状態、国家"),
            ("statue", "彫像"),
            ("status", "地位"),
            ("constant", "con(共に) + stant(立つ) ＝ 不変の"),
            ("distant", "dis(離れて) + stant(立つ) ＝ 遠い"),
        ],
        "insight": "現代英語で『立ち止まる・安定する・状態』を意味する単語の大部分がこの1語根から派生しています。"
    },
    {
        "root": "*weyd-",
        "meaning": "見る、知る",
        "words": [
            ("vision", "視覚、展望"),
            ("video", "映像（ラテン語 '私は見る'）"),
            ("advice", "ad(へ) + vis(見る) ＝ 助言"),
            ("evident", "e(外に) + vid(見える) ＝ 明白な"),
            ("wit / wise", "知恵、賢い（古英語経由）"),
        ],
        "insight": "『見る(video/vision)』と『知る(wit/wise)』が同じ語根なのは、見た経験が知識になるという古代の認知構造を反映しています。"
    },
    {
        "root": "*genh₁-",
        "meaning": "生む、種族、始まり",
        "words": [
            ("generate", "生成する"),
            ("genus", "属、種類"),
            ("genesis", "起源、創世記"),
            ("kin / kind", "親族、親切な"),
            ("native / nation", "生まれながらの、国家"),
        ],
        "insight": "遺伝(gene)、人種(gender)、親切(kind)、国家(nation)はすべて『命を生み出す』同一の祖語から生まれています。"
    }
]

def generate_daily_post():
    # Pick deterministic root based on day of year
    day_of_year = datetime.datetime.now().timetuple().tm_yday
    item = ROOTS[day_of_year % len(ROOTS)]
    
    app_url = "https://kohei519y-arch.github.io/vocab-vault/"
    
    lines = [
        f"【今日の一撃語根】{item['root']}（意味: {item['meaning']}）\n",
        f"印欧祖語の「{item['root']}」から生まれた現代英単語たち："
    ]
    for w, desc in item["words"][:5]:
        lines.append(f"・{w}: {desc}")
    
    lines.append(f"\n💡 語源の深層:\n{item['insight']}")
    lines.append(f"\nこの繋がりを力学グラフで視覚体験できる無料ツール👇\n{app_url}\n#英語学習 #語源 #TOEIC #英単語")
    
    post_text = "\n".join(lines)
    return post_text

if __name__ == "__main__":
    post = generate_daily_post()
    print("=== Generated Daily Etymology Post ===")
    print(post)
    print("=======================================")
    
    # Save to latest post artifact
    os.makedirs("docs/marketing/daily", exist_ok=True)
    today_str = datetime.date.today().isoformat()
    out_file = f"docs/marketing/daily/{today_str}.md"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(f"# Daily Etymology Post ({today_str})\n\n```text\n{post}\n```\n")
    print(f"Archived to {out_file}")
