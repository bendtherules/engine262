#!/usr/bin/perl
my $apple = '🍏';
sub getApple {
    print "Inside function: \$apple is now $apple\n";
}

sub call_1 {
	my $apple = '🍎';
	getApple();
}

call_1();
print "Outside function: \$apple is still $apple\n";