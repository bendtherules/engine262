#!/usr/bin/perl
local $apple = '🍏';
my $apple2 = '🍏';
sub getApple {
    print "Inside function: \$apple is $apple\n";
		print "Inside function: \$apple2 is $apple2\n";
}

sub call_1 {
	local $apple = '🍎';
	my $apple2 = '🍎';
	getApple();
}
call_1();