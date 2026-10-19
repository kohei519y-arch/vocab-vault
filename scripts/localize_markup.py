import re

def apply_localizations(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. audioPlaylistBar buttons
    content = content.replace(
        '<button type="button" class="ap-btn" id="apBtnPrev" data-act="playlist-prev" title="前の単語 (J)" aria-label="前へ">',
        '<button type="button" class="ap-btn" id="apBtnPrev" data-act="playlist-prev" data-i18n-title="speech.prev_title" title="前の単語 (J)" aria-label="前へ">'
    )
    content = content.replace(
        '<button type="button" class="ap-btn play" id="apBtnPlay" data-act="playlist-toggle" title="再生 / 一時停止 (K / Space)" aria-label="再生">',
        '<button type="button" class="ap-btn play" id="apBtnPlay" data-act="playlist-toggle" data-i18n-title="speech.play_title" title="再生 / 一時停止 (K / Space)" aria-label="再生">'
    )
    content = content.replace(
        '<button type="button" class="ap-btn" id="apBtnNext" data-act="playlist-next" title="次の単語 (L)" aria-label="次へ">',
        '<button type="button" class="ap-btn" id="apBtnNext" data-act="playlist-next" data-i18n-title="speech.next_title" title="次の単語 (L)" aria-label="次へ">'
    )
    content = content.replace(
        '<button type="button" class="ap-btn" id="apBtnClose" data-act="playlist-close" title="耳学モードを終了 (Esc)" aria-label="閉じる" style="margin-left:4px">',
        '<button type="button" class="ap-btn" id="apBtnClose" data-act="playlist-close" data-i18n-title="speech.close_title" title="耳学モードを終了 (Esc)" aria-label="閉じる" style="margin-left:4px">'
    )

    # 2. feedbackModal
    content = content.replace(
        '<h2 id="fbModalTitle">ご意見・フィードバック ＆ ユーザーヒアリング</h2>',
        '<h2 id="fbModalTitle" data-i18n="fb.title">ご意見・フィードバック ＆ ユーザーヒアリング</h2>'
    )
    content = content.replace(
        '<label class="lbl-sm">投稿種別</label>',
        '<label class="lbl-sm" data-i18n="fb.type_lbl">投稿種別</label>'
    )
    content = content.replace(
        '<option value="opinion">機能・使い勝手のご意見</option>',
        '<option value="opinion" data-i18n="fb.opt_opinion">機能・使い勝手のご意見</option>'
    )
    content = content.replace(
        '<option value="interview">30分オンラインヒアリングに参加希望（謝礼あり）</option>',
        '<option value="interview" data-i18n="fb.opt_interview">30分オンラインヒアリングに参加希望（謝礼あり）</option>'
    )
    content = content.replace(
        '<option value="feature">欲しい機能・言語の要望</option>',
        '<option value="feature" data-i18n="fb.opt_feature">欲しい機能・言語の要望</option>'
    )
    content = content.replace(
        '<option value="bug">不具合・表示崩れの報告</option>',
        '<option value="bug" data-i18n="fb.opt_bug">不具合・表示崩れの報告</option>'
    )
    content = content.replace(
        '<label class="lbl-sm">本アプリの満足度</label>',
        '<label class="lbl-sm" data-i18n="fb.sat_lbl">本アプリの満足度</label>'
    )
    content = content.replace(
        '<label><input type="radio" name="fbRating" value="5" checked> 大変満足</label>',
        '<label><input type="radio" name="fbRating" value="5" checked> <span data-i18n="fb.sat_very">大変満足</span></label>'
    )
    content = content.replace(
        '<label><input type="radio" name="fbRating" value="4"> 満足</label>',
        '<label><input type="radio" name="fbRating" value="4"> <span data-i18n="fb.sat_sat">満足</span></label>'
    )
    content = content.replace(
        '<label><input type="radio" name="fbRating" value="3"> 普通</label>',
        '<label><input type="radio" name="fbRating" value="3"> <span data-i18n="fb.sat_neutral">普通</span></label>'
    )
    content = content.replace(
        '<label><input type="radio" name="fbRating" value="2"> 不満</label>',
        '<label><input type="radio" name="fbRating" value="2"> <span data-i18n="fb.sat_unsat">不満</span></label>'
    )
    content = content.replace(
        '<label class="lbl-sm">ご意見・詳細内容</label>',
        '<label class="lbl-sm" data-i18n="fb.content_lbl">ご意見・詳細内容</label>'
    )
    content = content.replace(
        '<textarea id="fbContent" rows="4" placeholder="「語源解説が分かりやすかった」「フランス語の活用形をこう表示してほしい」「月額480円なら課金したい」など、率直なご意見をお願いします..."></textarea>',
        '<textarea id="fbContent" rows="4" data-i18n-ph="fb.content_ph" placeholder="「語源解説が分かりやすかった」「フランス語の活用形をこう表示してほしい」「月額480円なら課金したい」など、率直なご意見をお願いします..."></textarea>'
    )
    content = content.replace(
        '<label class="lbl-sm">適正と感じる月額料金（任意）</label>',
        '<label class="lbl-sm" data-i18n="fb.wtp_lbl">適正と感じる月額料金（任意）</label>'
    )
    content = content.replace(
        '<option value="">未選択</option>',
        '<option value="" data-i18n="fb.wtp_none">未選択</option>'
    )
    content = content.replace(
        '<option value="free_only">無料のみ（課金はしない）</option>',
        '<option value="free_only" data-i18n="fb.wtp_free">無料のみ（課金はしない）</option>'
    )
    content = content.replace(
        '<option value="sub_480">〜480円 / 月（Proプラン適正価格）</option>',
        '<option value="sub_480" data-i18n="fb.wtp_480">〜480円 / 月（Proプラン適正価格）</option>'
    )
    content = content.replace(
        '<option value="sub_980">〜980円 / 月</option>',
        '<option value="sub_980" data-i18n="fb.wtp_980">〜980円 / 月</option>'
    )
    content = content.replace(
        '<option value="sub_1500">〜1,500円 / 月</option>',
        '<option value="sub_1500" data-i18n="fb.wtp_1500">〜1,500円 / 月</option>'
    )
    content = content.replace(
        '<option value="lifetime">買い切り型なら払いたい</option>',
        '<option value="lifetime" data-i18n="fb.wtp_lifetime">買い切り型なら払いたい</option>'
    )
    content = content.replace(
        '<label class="lbl-sm">メールアドレス（ヒアリング希望者または返信希望時）</label>',
        '<label class="lbl-sm" data-i18n="fb.email_lbl">メールアドレス（ヒアリング希望者または返信希望時）</label>'
    )
    content = content.replace(
        '<button type="button" class="btn-o" onclick="window.VocabFeedback.closeFeedbackModal()">キャンセル</button>',
        '<button type="button" class="btn-o" onclick="window.VocabFeedback.closeFeedbackModal()" data-i18n="fb.cancel">キャンセル</button>'
    )
    content = content.replace(
        '<button type="submit" id="btnSubmitFb">フィードバックを送信</button>',
        '<button type="submit" id="btnSubmitFb" data-i18n="fb.submit">フィードバックを送信</button>'
    )

    # 3. analyticsModal
    content = content.replace(
        '<h2 id="analyticsModalTitle"><span>忘却予測カレンダー ＆ アナリティクス・ダッシュボード</span></h2>',
        '<h2 id="analyticsModalTitle"><span data-i18n="analytics.title">忘却予測カレンダー ＆ アナリティクス・ダッシュボード</span></h2>'
    )
    content = content.replace(
        '<button type="button" class="btn-o" onclick="toggleModal(\'analyticsModal\',false)">閉じる</button>',
        '<button type="button" class="btn-o" onclick="toggleModal(\'analyticsModal\',false)" data-i18n="btn.close">閉じる</button>'
    )

    # 4. editModal
    content = content.replace(
        '<h2 id="editModalTitle"><span>単語カードの完全編集（復習履歴は維持されます）</span></h2>',
        '<h2 id="editModalTitle"><span data-i18n="edit.title">単語カードの完全編集（復習履歴は維持されます）</span></h2>'
    )
    content = content.replace(
        '<label class="lbl-sm">見出し語</label>',
        '<label class="lbl-sm" data-i18n="edit.word_lbl">見出し語</label>'
    )
    content = content.replace(
        '<label class="lbl-sm" title="同形異義語の識別番号（通常は1）">同形#</label>',
        '<label class="lbl-sm" data-i18n="edit.homo_lbl" data-i18n-title="edit.homo_title" title="同形異義語の識別番号（通常は1）">同形#</label>'
    )
    content = content.replace(
        '<label class="lbl-sm">発音記号 (IPA)</label>',
        '<label class="lbl-sm" data-i18n="edit.pho_lbl">発音記号 (IPA)</label>'
    )
    content = content.replace(
        '<label class="lbl-sm">屈折・変化形 (複数形/三基本形)</label><input type="text" id="editGram" placeholder="例: l\'arbre, pl. -s">',
        '<label class="lbl-sm" data-i18n="edit.gram_lbl">屈折・変化形 (複数形/三基本形)</label><input type="text" id="editGram" data-i18n-ph="edit.gram_ph" placeholder="例: l\'arbre, pl. -s">'
    )
    content = content.replace(
        '<label class="lbl-sm">カテゴリ</label>',
        '<label class="lbl-sm" data-i18n="edit.cat_lbl">カテゴリ</label>'
    )
    content = content.replace(
        '<label class="lbl-sm">タイトル・分野</label>',
        '<label class="lbl-sm" data-i18n="edit.fol_lbl">タイトル・分野</label>'
    )
    content = content.replace(
        '<label class="lbl-sm">語源の確実性</label>',
        '<label class="lbl-sm" data-i18n="edit.conf_lbl">語源の確実性</label>'
    )
    content = content.replace(
        '<option value="">未設定 (変更しない)</option>',
        '<option value="" data-i18n="edit.conf_none">未設定 (変更しない)</option>'
    )
    content = content.replace(
        '<option value="certain">確実 (certain)</option>',
        '<option value="certain" data-i18n="edit.conf_certain">確実 (certain)</option>'
    )
    content = content.replace(
        '<option value="probable">有力 (probable)</option>',
        '<option value="probable" data-i18n="edit.conf_probable">有力 (probable)</option>'
    )
    content = content.replace(
        '<option value="disputed">諸説 (disputed)</option>',
        '<option value="disputed" data-i18n="edit.conf_disputed">諸説 (disputed)</option>'
    )
    content = content.replace(
        '<option value="unknown">不明 (unknown)</option>',
        '<option value="unknown" data-i18n="edit.conf_unknown">不明 (unknown)</option>'
    )
    content = content.replace(
        '<label class="lbl-sm">意味（1行に1つ「品詞 | 意味」形式。例: N[m] | 木、樹木）</label>',
        '<label class="lbl-sm" data-i18n="edit.meanings_lbl">意味（1行に1つ「品詞 | 意味」形式。例: N[m] | 木、樹木）</label>'
    )
    content = content.replace(
        '<label class="lbl-sm">歴史・専門補足（赤字括弧内に表示）</label>',
        '<label class="lbl-sm" data-i18n="edit.hist_lbl">歴史・専門補足（赤字括弧内に表示）</label>'
    )
    content = content.replace(
        '<label class="lbl-sm">コアイメージ</label>',
        '<label class="lbl-sm" data-i18n="edit.core_lbl">コアイメージ</label>'
    )
    content = content.replace(
        '<label class="lbl-sm">語源・概念史解説</label>',
        '<label class="lbl-sm" data-i18n="edit.ety_lbl">語源・概念史解説</label>'
    )
    content = content.replace(
        '<label class="lbl-sm">語源タグ（カンマ区切り。例: ラテン語: arbor (木)）</label>',
        '<label class="lbl-sm" data-i18n="edit.tags_lbl">語源タグ（カンマ区切り。例: ラテン語: arbor (木)）</label>'
    )
    content = content.replace(
        '<label class="lbl-sm">例文 (外国語)</label>',
        '<label class="lbl-sm" data-i18n="edit.ex_foreign_lbl">例文 (外国語)</label>'
    )
    content = content.replace(
        '<label class="lbl-sm" title="例文中で使われている活用形">文中活用形</label>',
        '<label class="lbl-sm" data-i18n="edit.ex_used_lbl" data-i18n-title="edit.ex_used_title" title="例文中で使われている活用形">文中活用形</label>'
    )
    content = content.replace(
        '<label class="lbl-sm">例文和訳（強調は &lt;b&gt;語&lt;/b&gt;）</label>',
        '<label class="lbl-sm" data-i18n="edit.ex_trans_lbl">例文和訳（強調は &lt;b&gt;語&lt;/b&gt;）</label>'
    )
    content = content.replace(
        '<label class="lbl-sm">重要表現（1行1件: 外国語表現 | 和訳）</label>',
        '<label class="lbl-sm" data-i18n="edit.phrases_lbl">重要表現（1行1件: 外国語表現 | 和訳）</label>'
    )
    content = content.replace(
        '<label class="lbl-sm">派生語（1行1件: 単語 | IPA | 品詞 | 意味 | 用例 | 用例訳）</label>',
        '<label class="lbl-sm" data-i18n="edit.deriv_lbl">派生語（1行1件: 単語 | IPA | 品詞 | 意味 | 用例 | 用例訳）</label>'
    )
    content = content.replace(
        '<button type="button" class="btn-o" onclick="toggleModal(\'editModal\',false)">キャンセル</button>',
        '<button type="button" class="btn-o" onclick="toggleModal(\'editModal\',false)" data-i18n="edit.cancel">キャンセル</button>'
    )
    content = content.replace(
        '<button type="button" onclick="saveEditCard()">変更を保存</button>',
        '<button type="button" onclick="saveEditCard()" data-i18n="edit.save">変更を保存</button>'
    )

    # 5. extractModal
    content = content.replace(
        '<h2 id="extModalTitle"><span>長文・画像からレベル別単語ピックアップ</span>',
        '<h2 id="extModalTitle"><span data-i18n="ext.title">長文・画像からレベル別単語ピックアップ</span>'
    )
    content = content.replace(
        '<label class="lbl-sm">対象者のレベル</label>',
        '<label class="lbl-sm" data-i18n="ext.level_lbl">対象者のレベル</label>'
    )
    content = content.replace(
        '<label class="lbl-sm">最大抽出数</label>',
        '<label class="lbl-sm" data-i18n="ext.max_lbl">最大抽出数</label>'
    )
    content = content.replace(
        '<label class="lbl-sm">保存先タイトル（任意）</label>',
        '<label class="lbl-sm" data-i18n="ext.fol_lbl">保存先タイトル（任意）</label>'
    )
    content = content.replace(
        '<span style="font-size:12px;font-weight:700">画像・写真から文字起こし（OCR）</span>',
        '<span style="font-size:12px;font-weight:700" data-i18n="ext.ocr_dropzone_title">画像・写真から文字起こし（OCR）</span>'
    )
    content = content.replace(
        '<span style="font-size:10.5px;color:var(--m)">画像選択 / ドロップ / スクショ貼り付け (Cmd+V)</span>',
        '<span style="font-size:10.5px;color:var(--m)" data-i18n="ext.ocr_dropzone_sub">画像選択 / ドロップ / スクショ貼り付け (Cmd+V)</span>'
    )
    content = content.replace(
        '<button type="button" class="btn-o btn-xs" onclick="$(\'ocrCameraInput\').click()" title="カメラで本・書類を直接撮影">撮影</button>',
        '<button type="button" class="btn-o btn-xs" onclick="$(\'ocrCameraInput\').click()" title="カメラで本・書類を直接撮影" data-i18n="ext.camera_btn">撮影</button>'
    )
    content = content.replace(
        '<button type="button" class="btn-o btn-xs" onclick="$(\'ocrFileInput\').click()" title="アルバムまたはファイルから選択">選択</button>',
        '<button type="button" class="btn-o btn-xs" onclick="$(\'ocrFileInput\').click()" title="アルバムまたはファイルから選択" data-i18n="ext.select_btn">選択</button>'
    )
    content = content.replace(
        '<label class="lbl-sm">長文テキスト（最大12,000字）</label>',
        '<label class="lbl-sm" data-i18n="ext.text_lbl">長文テキスト（最大12,000字）</label>'
    )
    content = content.replace(
        '<textarea id="extTextarea" rows="6" placeholder="長文を貼り付けるか、上の枠から画像を読み込んでください..."></textarea>',
        '<textarea id="extTextarea" rows="6" data-i18n-ph="ext.text_ph" placeholder="長文を貼り付けるか、上の枠から画像を読み込んでください..."></textarea>'
    )
    content = content.replace(
        '<button type="button" id="btnRunExtract" onclick="runPassageExtract()">長文を解析して単語をピックアップ</button>',
        '<button type="button" id="btnRunExtract" onclick="runPassageExtract()" data-i18n="ext.extract_btn">長文を解析して単語をピックアップ</button>'
    )
    content = content.replace(
        '<button type="button" class="btn-o btn-xs" onclick="toggleAllExtChecks(true)">未登録のみ選択</button>',
        '<button type="button" class="btn-o btn-xs" onclick="toggleAllExtChecks(true)" data-i18n="ext.select_unregistered">未登録のみ選択</button>'
    )
    content = content.replace(
        '<button type="button" class="btn-o btn-xs" onclick="toggleAllExtChecks(\'all\')">すべて選択</button>',
        '<button type="button" class="btn-o btn-xs" onclick="toggleAllExtChecks(\'all\')" data-i18n="ext.select_all">すべて選択</button>'
    )
    content = content.replace(
        '<button type="button" class="btn-o btn-xs" onclick="toggleAllExtChecks(false)">全解除</button>',
        '<button type="button" class="btn-o btn-xs" onclick="toggleAllExtChecks(false)" data-i18n="ext.deselect_all">全解除</button>'
    )
    content = content.replace(
        '<button type="button" class="btn-o" onclick="toggleModal(\'extractModal\',false)">キャンセル</button>',
        '<button type="button" class="btn-o" onclick="toggleModal(\'extractModal\',false)" data-i18n="btn.cancel">キャンセル</button>'
    )
    content = content.replace(
        '<button type="button" id="btnCommitExt" onclick="commitExtractedWords()">選択した単語を単語帳に登録</button>',
        '<button type="button" id="btnCommitExt" onclick="commitExtractedWords()" data-i18n="ext.commit_btn">選択した単語を単語帳に登録</button>'
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Applied localization attributes to {filepath}")

if __name__ == '__main__':
    apply_localizations('index.html')
    apply_localizations('dev.html')
