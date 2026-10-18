/**
 * Vocab Vault - Native macOS WebKit E2E Headless Test Runner (scripts/e2e_webkit_runner.m)
 * Executes real Apple WebKit DOM rendering, JS execution, touch event dispatch,
 * 5-locale switching, 5-tab settings navigation, and WebGL context verification.
 * Zero npm/node dependency - runs directly via Apple clang & WebKit.framework.
 */
#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface WebKitTestRunner : NSObject <WKNavigationDelegate>
@property (nonatomic, strong) WKWebView *webView;
@property (nonatomic, assign) BOOL isFinished;
@property (nonatomic, assign) int exitCode;
@property (nonatomic, strong) NSString *baseDir;
@end

@implementation WebKitTestRunner

- (instancetype)initWithHtmlPath:(NSString *)path {
    self = [super init];
    if (self) {
        WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
        config.websiteDataStore = [WKWebsiteDataStore nonPersistentDataStore];
        config.preferences.javaScriptCanOpenWindowsAutomatically = NO;
        [config.preferences setValue:@YES forKey:@"allowFileAccessFromFileURLs"];

        self.webView = [[WKWebView alloc] initWithFrame:NSMakeRect(0, 0, 1280, 800) configuration:config];
        self.webView.navigationDelegate = self;
        self.isFinished = NO;
        self.exitCode = 0;

        NSURL *fileUrl = [NSURL fileURLWithPath:path];
        NSURL *dirUrl = [fileUrl URLByDeletingLastPathComponent];
        self.baseDir = dirUrl.path;
        [self.webView loadFileURL:fileUrl allowingReadAccessToURL:dirUrl];
    }
    return self;
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(400 * NSEC_PER_MSEC)), dispatch_get_main_queue(), ^{
        [self runE2ETests];
    });
}

- (void)webView:(WKWebView *)webView didFailNavigation:(WKNavigation *)navigation withError:(NSError *)error {
    fprintf(stderr, "[ERROR] WebKit navigation failed: %s\n", error.localizedDescription.UTF8String);
    self.exitCode = 1;
    self.isFinished = YES;
}

- (void)webView:(WKWebView *)webView didFailProvisionalNavigation:(WKNavigation *)navigation withError:(NSError *)error {
    fprintf(stderr, "[ERROR] WebKit provisional navigation failed: %s\n", error.localizedDescription.UTF8String);
    self.exitCode = 1;
    self.isFinished = YES;
}

- (void)runE2ETests {
    NSString *specPath = [self.baseDir stringByAppendingPathComponent:@"scripts/webkit_e2e_spec.js"];
    if (![[NSFileManager defaultManager] fileExistsAtPath:specPath]) {
        // Fallback relative to current directory
        specPath = @"scripts/webkit_e2e_spec.js";
    }

    NSError *specError = nil;
    NSString *testScript = [NSString stringWithContentsOfFile:specPath encoding:NSUTF8StringEncoding error:&specError];
    if (!testScript) {
        fprintf(stderr, "[ERROR] Could not load %s: %s\n", specPath.UTF8String, specError.localizedDescription.UTF8String);
        self.exitCode = 1;
        self.isFinished = YES;
        return;
    }

    [self.webView evaluateJavaScript:testScript completionHandler:^(id result, NSError *error) {
        if (error) {
            fprintf(stderr, "[ERROR] JavaScript execution failed: %s | %s\n", error.localizedDescription.UTF8String, error.userInfo.description.UTF8String);
            self.exitCode = 1;
        } else if ([result isKindOfClass:[NSString class]]) {
            NSData *data = [((NSString *)result) dataUsingEncoding:NSUTF8StringEncoding];
            NSDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
            BOOL ok = [json[@"ok"] boolValue];
            NSArray *results = json[@"results"];

            int passed = 0;
            int failed = 0;
            for (NSDictionary *r in results) {
                NSString *name = r[@"name"];
                BOOL p = [r[@"pass"] boolValue];
                if (p) {
                    printf("  [PASS] [WebKit E2E] %s\n", name.UTF8String);
                    passed++;
                } else {
                    printf("  [FAIL] [WebKit E2E] %s (%s)\n", name.UTF8String, [r[@"err"] UTF8String]);
                    failed++;
                }
            }

            if (!ok || failed > 0) {
                if (json[@"error"]) {
                    fprintf(stderr, "  [FAIL] Unhandled WebKit JS Exception: %s\n", [json[@"error"] UTF8String]);
                }
                self.exitCode = 1;
            } else {
                printf("[PASS] Native WebKit E2E: All %d assertions passed flawlessly!\n", passed);
                self.exitCode = 0;
            }
        }
        self.isFinished = YES;
    }];
}

@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSString *htmlPath = nil;
        if (argc > 1) {
            htmlPath = [NSString stringWithUTF8String:argv[1]];
        } else {
            htmlPath = [[NSFileManager defaultManager] currentDirectoryPath];
            htmlPath = [htmlPath stringByAppendingPathComponent:@"index.html"];
        }

        if (![[NSFileManager defaultManager] fileExistsAtPath:htmlPath]) {
            fprintf(stderr, "Error: index.html not found at path: %s\n", htmlPath.UTF8String);
            return 1;
        }

        [NSApplication sharedApplication];
        [NSApp setActivationPolicy:NSApplicationActivationPolicyProhibited];

        WebKitTestRunner *runner = [[WebKitTestRunner alloc] initWithHtmlPath:htmlPath];

        NSDate *timeoutDate = [NSDate dateWithTimeIntervalSinceNow:15.0];
        while (!runner.isFinished && [timeoutDate timeIntervalSinceNow] > 0) {
            [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.05]];
        }

        if (!runner.isFinished) {
            fprintf(stderr, "[TIMEOUT] WebKit E2E runner timed out after 15 seconds\n");
            return 1;
        }

        return runner.exitCode;
    }
}
