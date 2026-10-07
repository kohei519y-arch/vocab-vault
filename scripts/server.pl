#!/usr/bin/perl
use strict;
use warnings;
use IO::Socket::INET;

my $port = $ARGV[0] || 28374;
my $dir  = $ARGV[1] || '.';

# すでに同じポートで動いているか確認
my $test = IO::Socket::INET->new(PeerAddr => '127.0.0.1', PeerPort => $port, Proto => 'tcp', Timeout => 1);
if ($test) {
    close($test);
    print "Server already running on port $port\n";
    exit 0;
}

my $server = IO::Socket::INET->new(
    LocalAddr => '127.0.0.1',
    LocalPort => $port,
    Proto     => 'tcp',
    Listen    => 10,
    Reuse     => 1
) or die "Cannot bind to 127.0.0.1:$port: $!\n";

print "Vocab Vault server running at http://127.0.0.1:$port/\n";

my %mimes = (
    'html' => 'text/html; charset=utf-8',
    'css'  => 'text/css; charset=utf-8',
    'js'   => 'application/javascript; charset=utf-8',
    'json' => 'application/json; charset=utf-8',
    'png'  => 'image/png',
    'svg'  => 'image/svg+xml',
    'ico'  => 'image/x-icon'
);

while (my $client = $server->accept()) {
    my $req = <$client>;
    next unless $req;
    my ($method, $path) = split(/\s+/, $req);
    $path =~ s/\?.*$//; # クエリ除去
    $path =~ s|^/+||;
    $path = 'index.html' if $path eq '' || $path eq '/';
    $path =~ s|\.\./||g; # パストラバーサル防止

    my $filepath = "$dir/$path";
    if (-f $filepath && open(my $fh, '<:raw', $filepath)) {
        my ($ext) = ($filepath =~ /\.([a-zA-Z0-9]+)$/);
        my $mime = $mimes{lc($ext || '')} || 'application/octet-stream';
        my $content = do { local $/; <$fh> };
        close($fh);

        my $len = length($content);
        print $client "HTTP/1.1 200 OK\r\n";
        print $client "Content-Type: $mime\r\n";
        print $client "Content-Length: $len\r\n";
        print $client "Access-Control-Allow-Origin: *\r\n";
        print $client "Connection: close\r\n\r\n";
        print $client $content;
    } else {
        print $client "HTTP/1.1 404 Not Found\r\nContent-Length: 9\r\nConnection: close\r\n\r\nNot Found";
    }
    close($client);
}
