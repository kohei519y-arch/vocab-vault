#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface AppDelegate : NSObject <NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler>
@property (strong, nonatomic) NSWindow *window;
@property (strong, nonatomic) WKWebView *webView;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    // 1. メインウィンドウの生成
    NSRect screenRect = [[NSScreen mainScreen] visibleFrame];
    CGFloat width = MIN(1320.0, screenRect.size.width * 0.88);
    CGFloat height = MIN(900.0, screenRect.size.height * 0.90);
    NSRect windowRect = NSMakeRect((screenRect.size.width - width) / 2.0,
                                   (screenRect.size.height - height) / 2.0,
                                   width, height);

    NSWindowStyleMask styleMask = NSWindowStyleMaskTitled |
                                  NSWindowStyleMaskClosable |
                                  NSWindowStyleMaskMiniaturizable |
                                  NSWindowStyleMaskResizable;

    self.window = [[NSWindow alloc] initWithContentRect:windowRect
                                              styleMask:styleMask
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];
    [self.window setTitle:@"Vocab Vault"];
    [self.window setMinSize:NSMakeSize(640, 480)];
    [self.window setDelegate:self];
    [self.window center];

    // 2. WKWebViewの設定 (オフラインファースト、IndexedDB、スクリプトハンドラ対応)
    WKUserContentController *userContent = [[WKUserContentController alloc] init];
    [userContent addScriptMessageHandler:self name:@"nativeSave"];
    [userContent addScriptMessageHandler:self name:@"nativePrint"];

    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    config.userContentController = userContent;
    WKPreferences *prefs = config.preferences;
    prefs.javaScriptCanOpenWindowsAutomatically = YES;
    [prefs setValue:@YES forKey:@"developerExtrasEnabled"];
    [prefs setValue:@YES forKey:@"allowFileAccessFromFileURLs"];

    self.webView = [[WKWebView alloc] initWithFrame:[[self.window contentView] bounds] configuration:config];
    [self.webView setAutoresizingMask:(NSViewWidthSizable | NSViewHeightSizable)];
    [self.webView setNavigationDelegate:self];
    [self.webView setUIDelegate:self];

    [[self.window contentView] addSubview:self.webView];

    // 3. ネイティブメニューバーの構築 (Copy / Paste / Close / Quit / Zoom 等)
    NSMenu *menubar = [[NSMenu alloc] init];
    
    // App Menu
    NSMenuItem *appMenuItem = [[NSMenuItem alloc] init];
    [menubar addItem:appMenuItem];
    NSMenu *appMenu = [[NSMenu alloc] init];
    [appMenu addItemWithTitle:@"About Vocab Vault" action:@selector(orderFrontStandardAboutPanel:) keyEquivalent:@""];
    [appMenu addItem:[NSMenuItem separatorItem]];
    [appMenu addItemWithTitle:@"Hide Vocab Vault" action:@selector(hide:) keyEquivalent:@"h"];
    NSMenuItem *hideOthers = [appMenu addItemWithTitle:@"Hide Others" action:@selector(hideOtherApplications:) keyEquivalent:@"h"];
    [hideOthers setKeyEquivalentModifierMask:(NSEventModifierFlagOption | NSEventModifierFlagCommand)];
    [appMenu addItemWithTitle:@"Show All" action:@selector(unhideAllApplications:) keyEquivalent:@""];
    [appMenu addItem:[NSMenuItem separatorItem]];
    [appMenu addItemWithTitle:@"Quit Vocab Vault" action:@selector(terminate:) keyEquivalent:@"q"];
    [appMenuItem setSubmenu:appMenu];

    // Edit Menu
    NSMenuItem *editMenuItem = [[NSMenuItem alloc] init];
    [menubar addItem:editMenuItem];
    NSMenu *editMenu = [[NSMenu alloc] initWithTitle:@"Edit"];
    [editMenu addItemWithTitle:@"Undo" action:NSSelectorFromString(@"undo:") keyEquivalent:@"z"];
    [editMenu addItemWithTitle:@"Redo" action:NSSelectorFromString(@"redo:") keyEquivalent:@"Z"];
    [editMenu addItem:[NSMenuItem separatorItem]];
    [editMenu addItemWithTitle:@"Cut" action:NSSelectorFromString(@"cut:") keyEquivalent:@"x"];
    [editMenu addItemWithTitle:@"Copy" action:NSSelectorFromString(@"copy:") keyEquivalent:@"c"];
    [editMenu addItemWithTitle:@"Paste" action:NSSelectorFromString(@"paste:") keyEquivalent:@"v"];
    [editMenu addItemWithTitle:@"Select All" action:NSSelectorFromString(@"selectAll:") keyEquivalent:@"a"];
    [editMenuItem setSubmenu:editMenu];

    // View Menu
    NSMenuItem *viewMenuItem = [[NSMenuItem alloc] init];
    [menubar addItem:viewMenuItem];
    NSMenu *viewMenu = [[NSMenu alloc] initWithTitle:@"View"];
    [viewMenu addItemWithTitle:@"Reload" action:@selector(reloadPage:) keyEquivalent:@"r"];
    [viewMenu addItemWithTitle:@"Actual Size" action:@selector(actualSize:) keyEquivalent:@"0"];
    [viewMenu addItemWithTitle:@"Zoom In" action:@selector(zoomIn:) keyEquivalent:@"+"];
    [viewMenu addItemWithTitle:@"Zoom Out" action:@selector(zoomOut:) keyEquivalent:@"-"];
    [viewMenu addItem:[NSMenuItem separatorItem]];
    [viewMenu addItemWithTitle:@"Toggle Full Screen" action:@selector(toggleFullScreen:) keyEquivalent:@"f"];
    [viewMenuItem setSubmenu:viewMenu];

    // Window Menu
    NSMenuItem *windowMenuItem = [[NSMenuItem alloc] init];
    [menubar addItem:windowMenuItem];
    NSMenu *windowMenu = [[NSMenu alloc] initWithTitle:@"Window"];
    [windowMenu addItemWithTitle:@"Minimize" action:@selector(performMiniaturize:) keyEquivalent:@"m"];
    [windowMenu addItemWithTitle:@"Zoom" action:@selector(performZoom:) keyEquivalent:@""];
    [windowMenuItem setSubmenu:windowMenu];

    [NSApp setMainMenu:menubar];

    // 4. ロード対象URLの選定 (アプリ内バンドルWebリソース直接ロード)
    NSBundle *mainBundle = [NSBundle mainBundle];
    NSString *bundleResPath = [mainBundle resourcePath];
    NSString *resDev = [bundleResPath stringByAppendingPathComponent:@"web/dev.html"];
    NSString *resIndex = [bundleResPath stringByAppendingPathComponent:@"web/index.html"];

    NSFileManager *fm = [NSFileManager defaultManager];
    NSURL *targetUrl = nil;
    NSURL *readAccessUrl = nil;

    if ([fm fileExistsAtPath:resDev]) {
        targetUrl = [NSURL fileURLWithPath:resDev];
        readAccessUrl = [NSURL fileURLWithPath:[bundleResPath stringByAppendingPathComponent:@"web"]];
    } else if ([fm fileExistsAtPath:resIndex]) {
        targetUrl = [NSURL fileURLWithPath:resIndex];
        readAccessUrl = [NSURL fileURLWithPath:[bundleResPath stringByAppendingPathComponent:@"web"]];
    } else {
        targetUrl = [NSURL URLWithString:@"https://kohei519y-arch.github.io/vocab-vault/"];
    }

    if (readAccessUrl && targetUrl.isFileURL) {
        [self.webView loadFileURL:targetUrl allowingReadAccessToURL:readAccessUrl];
    } else if (targetUrl) {
        [self.webView loadRequest:[NSURLRequest requestWithURL:targetUrl]];
    }

    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return YES;
}

- (void)reloadPage:(id)sender {
    [self.webView reload];
}

- (void)actualSize:(id)sender {
    self.webView.pageZoom = 1.0;
}

- (void)zoomIn:(id)sender {
    self.webView.pageZoom += 0.1;
}

- (void)zoomOut:(id)sender {
    if (self.webView.pageZoom > 0.4) {
        self.webView.pageZoom -= 0.1;
    }
}

// 5. JavaScript ダイアログのネイティブ対応 (単語削除 confirm / alert / prompt)
- (void)webView:(WKWebView *)webView runJavaScriptConfirmPanelWithMessage:(NSString *)message initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(BOOL result))completionHandler {
    NSAlert *alert = [[NSAlert alloc] init];
    [alert setMessageText:@"Vocab Vault"];
    [alert setInformativeText:message];
    
    NSString *primaryTitle = @"OK";
    if ([message containsString:@"削除"] || [message containsString:@"抹消"]) {
        primaryTitle = @"削除";
    } else if ([message containsString:@"ダウンロード"] || [message containsString:@"保存"]) {
        primaryTitle = @"保存";
    } else if ([message containsString:@"リセット"]) {
        primaryTitle = @"リセット";
    } else if ([message containsString:@"スヌーズ"] || [message containsString:@"再分散"]) {
        primaryTitle = @"再分散する";
    } else if ([message containsString:@"開始しますか"]) {
        primaryTitle = @"開始";
    }
    [alert addButtonWithTitle:primaryTitle];
    [alert addButtonWithTitle:@"キャンセル"];
    [alert setAlertStyle:([primaryTitle isEqualToString:@"削除"] ? NSAlertStyleWarning : NSAlertStyleInformational)];
    [alert beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse returnCode) {
        completionHandler(returnCode == NSAlertFirstButtonReturn);
    }];
}

- (void)webView:(WKWebView *)webView runJavaScriptAlertPanelWithMessage:(NSString *)message initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(void))completionHandler {
    NSAlert *alert = [[NSAlert alloc] init];
    [alert setMessageText:@"Vocab Vault"];
    [alert setInformativeText:message];
    [alert addButtonWithTitle:@"OK"];
    [alert setAlertStyle:NSAlertStyleInformational];
    [alert beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse returnCode) {
        completionHandler();
    }];
}

- (void)webView:(WKWebView *)webView runJavaScriptTextInputPanelWithPrompt:(NSString *)prompt defaultText:(NSString *)defaultText initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(NSString * _Nullable result))completionHandler {
    NSAlert *alert = [[NSAlert alloc] init];
    [alert setMessageText:@"Vocab Vault"];
    [alert setInformativeText:prompt];
    [alert addButtonWithTitle:@"OK"];
    [alert addButtonWithTitle:@"キャンセル"];
    NSTextField *input = [[NSTextField alloc] initWithFrame:NSMakeRect(0, 0, 300, 24)];
    [input setStringValue:defaultText ?: @""];
    [alert setAccessoryView:input];
    [alert beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse returnCode) {
        if (returnCode == NSAlertFirstButtonReturn) {
            completionHandler([input stringValue]);
        } else {
            completionHandler(nil);
        }
    }];
}

// 6. ファイル選択ダイアログ (JSON復元 / input type="file" のネイティブ対応)
- (void)webView:(WKWebView *)webView runOpenPanelWithParameters:(WKOpenPanelParameters *)parameters initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(NSArray<NSURL *> * _Nullable))completionHandler {
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    [panel setCanChooseFiles:YES];
    [panel setCanChooseDirectories:NO];
    [panel setAllowsMultipleSelection:parameters.allowsMultipleSelection];
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [panel setAllowedFileTypes:@[@"json", @"txt", @"csv", @"tsv"]];
#pragma clang diagnostic pop
    [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse result) {
        if (result == NSModalResponseOK) {
            completionHandler(panel.URLs);
        } else {
            completionHandler(nil);
        }
    }];
}

// 6. ネイティブファイル保存 (JSON保存 / PNG画像保存 / NSSavePanel 対応)
- (void)userContentController:(WKUserContentController *)userContentController didReceiveScriptMessage:(WKScriptMessage *)message {
    if ([message.name isEqualToString:@"nativeSave"]) {
        NSDictionary *body = message.body;
        if (![body isKindOfClass:[NSDictionary class]]) return;
        NSString *filename = [body[@"filename"] isKindOfClass:[NSString class]] ? body[@"filename"] : @"vocab_vault_backup.json";
        NSString *content = [body[@"content"] isKindOfClass:[NSString class]] ? body[@"content"] : nil;
        NSString *base64 = [body[@"base64"] isKindOfClass:[NSString class]] ? body[@"base64"] : nil;
        BOOL isBase64DataUrl = [body[@"isBase64DataUrl"] respondsToSelector:@selector(boolValue)] ? [body[@"isBase64DataUrl"] boolValue] : NO;

        NSSavePanel *savePanel = [NSSavePanel savePanel];
        [savePanel setNameFieldStringValue:filename];
        NSString *ext = [filename pathExtension];
        if (ext.length > 0) {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
            [savePanel setAllowedFileTypes:@[ext]];
#pragma clang diagnostic pop
        }
        [savePanel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse result) {
            if (result == NSModalResponseOK) {
                NSURL *saveUrl = [savePanel URL];
                if (saveUrl) {
                    NSError *err = nil;
                    if (base64.length > 0) {
                        NSData *binData = [[NSData alloc] initWithBase64EncodedString:base64 options:NSDataBase64DecodingIgnoreUnknownCharacters];
                        [binData writeToURL:saveUrl options:NSDataWritingAtomic error:&err];
                    } else if ((isBase64DataUrl || [content hasPrefix:@"data:"]) && content != nil) {
                        NSRange commaRange = [content rangeOfString:@","];
                        NSString *b64Str = (commaRange.location != NSNotFound) ? [content substringFromIndex:commaRange.location + 1] : content;
                        NSData *imgData = [[NSData alloc] initWithBase64EncodedString:b64Str options:NSDataBase64DecodingIgnoreUnknownCharacters];
                        [imgData writeToURL:saveUrl options:NSDataWritingAtomic error:&err];
                    } else if (content != nil) {
                        [content writeToURL:saveUrl atomically:YES encoding:NSUTF8StringEncoding error:&err];
                    }
                }
            }
        }];
        return;
    }
    if ([message.name isEqualToString:@"nativePrint"]) {
        NSPrintOperation *op = [self.webView printOperationWithPrintInfo:[NSPrintInfo sharedPrintInfo]];
        [op setShowsPrintPanel:YES];
        [op runOperationModalForWindow:self.window delegate:nil didRunSelector:NULL contextInfo:NULL];
        return;
    }
}

- (void)applicationWillTerminate:(NSNotification *)notification {
    [self.webView.configuration.userContentController removeScriptMessageHandlerForName:@"nativeSave"];
    [self.webView.configuration.userContentController removeScriptMessageHandlerForName:@"nativePrint"];
}

// 7. ナビゲーションポリシー (blob: URL誤動作の根絶 & 外部リンク安全化)
- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    NSURL *url = navigationAction.request.URL;
    NSString *scheme = url.scheme.lowercaseString;

    // blob: や data:、about: は外部アプリに回さずWebコンテキスト内で正常処理
    if ([scheme isEqualToString:@"blob"] || [scheme isEqualToString:@"data"] || [scheme isEqualToString:@"about"]) {
        decisionHandler(WKNavigationActionPolicyAllow);
        return;
    }

    if (navigationAction.navigationType == WKNavigationTypeLinkActivated) {
        if (![scheme isEqualToString:@"file"] && ![url.host containsString:@"github.io"] && ![url.host containsString:@"vercel.app"]) {
            [[NSWorkspace sharedWorkspace] openURL:url];
            decisionHandler(WKNavigationActionPolicyCancel);
            return;
        }
    }
    decisionHandler(WKNavigationActionPolicyAllow);
}

// 8. ページ読み込み完了時の自動復元 (端末内限定: 救出ファイルが存在する場合に自動マージ)
- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    NSString *appDir = [[NSBundle mainBundle] bundlePath];
    NSString *parentDir = [appDir stringByDeletingLastPathComponent];
    NSString *backupFile1 = [parentDir stringByAppendingPathComponent:@"VocabVault_Recovered_Full_Backup.json"];
    NSString *backupFile2 = [[[NSBundle mainBundle] resourcePath] stringByAppendingPathComponent:@"VocabVault_Recovered_Full_Backup.json"];

    NSFileManager *fm = [NSFileManager defaultManager];
    NSString *targetFile = nil;
    if ([fm fileExistsAtPath:backupFile1]) {
        targetFile = backupFile1;
    } else if ([fm fileExistsAtPath:backupFile2]) {
        targetFile = backupFile2;
    }

    if (targetFile) {
        NSData *data = [NSData dataWithContentsOfFile:targetFile];
        if (data && data.length > 0) {
            NSString *base64 = [data base64EncodedStringWithOptions:0];
            NSString *injectJs = [NSString stringWithFormat:
                @"(function() {"
                @"  function runNativeRestore() {"
                @"    try {"
                @"      if (localStorage.getItem('vv_native_restored_v1')) return;"
                @"      if (!window.VocabStorage || !window.VocabStorage.setJson || !window.App) return;"
                @"      var b64 = '%@';"
                @"      var bin = atob(b64);"
                @"      var bytes = new Uint8Array(bin.length);"
                @"      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);"
                @"      var decoded = new TextDecoder('utf-8').decode(bytes);"
                @"      var payload = JSON.parse(decoded);"
                @"      var curCount = (App.entries || []).length;"
                @"      if (curCount <= 25) {"
                @"        localStorage.setItem('vv_native_restored_v1', '1');"
                @"        var en = payload.en || [];"
                @"        var fr = payload.fr || [];"
                @"        var de = payload.de || [];"
                @"        if (en.length > 0) {"
                @"          var curEn = VocabStorage.getJson('distinction_entries');"
                @"          var mergedEn = VocabStorage.mergeWords(curEn, en, 'distinction_entries', true);"
                @"          VocabStorage.setJson('distinction_entries', mergedEn);"
                @"        }"
                @"        if (fr.length > 0) {"
                @"          var curFr = VocabStorage.getJson('distinction_entries_fr');"
                @"          var mergedFr = VocabStorage.mergeWords(curFr, fr, 'distinction_entries_fr', true);"
                @"          VocabStorage.setJson('distinction_entries_fr', mergedFr);"
                @"        }"
                @"        if (de.length > 0) {"
                @"          var curDe = VocabStorage.getJson('distinction_entries_de');"
                @"          var mergedDe = VocabStorage.mergeWords(curDe, de, 'distinction_entries_de', true);"
                @"          VocabStorage.setJson('distinction_entries_de', mergedDe);"
                @"        }"
                @"        setTimeout(function() {"
                @"          if (typeof App.reload === 'function') App.reload();"
                @"          else location.reload();"
                @"        }, 150);"
                @"      } else {"
                @"        localStorage.setItem('vv_native_restored_v1', '1');"
                @"      }"
                @"    } catch(e) { console.error('Native Auto Restore Err:', e); }"
                @"  }"
                @"  setTimeout(runNativeRestore, 350);"
                @"})();", base64];
            [webView evaluateJavaScript:injectJs completionHandler:nil];
        }
    }
}

@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        [app setActivationPolicy:NSApplicationActivationPolicyRegular];
        AppDelegate *delegate = [[AppDelegate alloc] init];
        [app setDelegate:delegate];
        [app run];
    }
    return 0;
}
