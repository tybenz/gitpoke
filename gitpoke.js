var _ = require( 'lodash-node' );
var readline = require( 'readline' );
var Mon = require( 'mon' );
var Gitwar = require( 'gitwar' );
var colors = require( 'colors' );

var Gitpoke = {
    init: function() {
        Gitwar.init()
        .then( function() {
            return Gitpoke.setState();
        })
        .then( function() {
            return Gitwar.head();
        })
        .then( function( head ) {
            // TODO - Check for win

            if ( head.user == Gitwar.me ) {
                clear();
                print( 'score' );
                Gitpoke.wait( true );
            } else {
                Gitpoke.takeTurn();
            }
        });
    },

    script: {
        wait: function() {
            return ( Gitwar.opponent + '\'s' ).red + ' turn. Waiting...';
        },
        score: function() {
            return ( Gitwar.me + '\'s ' + Gitpoke.mine.name ).green + ': ' + Gitpoke.mine.hp + '\n' +
                ( Gitwar.opponent + '\'s ' + Gitpoke.theirs.name ).red + ': ' + Gitpoke.theirs.hp + '\n';
        },
        move: function() {
            var moves = Gitpoke.mine.moves();
            var longest = _.reduce( moves, function( max, move ) {
                return max > move.name.length ? max : move.name.length;
            }, 0 );
            var i;
            var topLine = '┌──';
            for ( i = 0; i < longest; i++ ) { topLine += '─'; }
            topLine += '──┬──';
            for ( i = 0; i < longest; i++ ) { topLine += '─'; }
            topLine += '──┐\n│';
            var middleLine = '├──';
            for ( i = 0; i < longest; i++ ) { middleLine += '─'; }
            middleLine += '──┼──';
            for ( i = 0; i < longest; i++ ) { middleLine += '─'; }
            middleLine += '──┤';
            var bottomLine = '└──';
            for ( i = 0; i < longest; i++ ) { bottomLine += '─'; }
            bottomLine += '──┴──';
            for ( i = 0; i < longest; i++ ) { bottomLine += '─'; }
            bottomLine += '──┘';
            return _.reduce( Gitpoke.mine.moves(), function( str, move, j ) {
                if ( j == 2 ) {
                    str += '\n' + middleLine + '\n│';
                }
                str += '  ';
                str += move.name;
                for ( var k = move.name.length; k < longest; k++ ) {
                    str += ' ';
                }
                str += '  │';
                if ( j == 3 ) {
                    str += '\n' + bottomLine + '\nHow would you like to attack? ';
                }
                return str;
            }, topLine );
        }
    },

    setState: function() {
        return Gitwar.logs()
        .then( function( commits ) {
            return _.each( commits.reverse(), function( commit, i ) {
                // Selection commits are made at the beginning when the user is
                // asked to choose their character. The level, stats, and
                // possible moves are randomly selected. We store all of that
                // information in the commit
                if ( commit.select ) {
                    var mineOrTheirs = commit.user == Gitwar.me ? 'mine' : 'theirs';
                    var pokemon = Mon.Pokedex.findByName( commit.select );

                    // Setting moves as chosen during initial selection phase
                    pokemon.setMoves( Mon.Pokedex.movesFromNames( commit.moves ) );
                    // Setting stats as chosen during initial selection
                    pokemon.setStatsFromObj( commit.stats );

                    Gitpoke[ mineOrTheirs ] = pokemon;
                }
                if ( commit.damage ) {
                    if ( commit.user == Gitwar.me ) {
                        Gitpoke.theirs.hp -= commit.damage;
                    } else {
                        Gitpoke.mine.hp -= commit.damage;
                    }
                }
            });
        });
    },

    takeTurn: function( lastTurn ) {
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl._setPrompt = rl.setPrompt;
        rl.setPrompt = function( prompt, length ) {
            var lines = prompt.split( /[\r\n]/ );
            var lastNonEmptyLine = _.reduce( lines.reverse(), function( last, line ) {
                if ( !last && line.length ) {
                    last = line;
                }
                return last;
            }, '' );
            rl._setPrompt( prompt, length ? length : lastNonEmptyLine.length );
        };

        // prompt user for move
        // two newlines at the end due to faulty readline implementation
        clear();
        rl.question( Gitpoke.script.score() + Gitpoke.script.move() + '\n\n', function( move ) {
            var turn = {
                user: Gitwar.me,
                move: move
            };

            var oldHp = Gitpoke.theirs.hp;

            Gitpoke.mine.attack( move, Gitpoke.theirs );

            turn.hitPoints = oldHp - Gitpoke.theirs.hp;

            Gitwar.addLog( turn )
            .then( function() {
                Gitpoke.wait();
            });

            rl.close();
        });
    },

    wait: function( first ) {
        print( 'wait' );

        if ( first ) {
            // If this is the very first step after init has been called we
            // don't want to call sync, because the head check will be out of
            // sync
            Gitwar.poll( Gitpoke.takeTurn );
        } else {
            Gitwar.sync()
            .then( function() {
                return Gitwar.poll( Gitpoke.takeTurn );
            });
        }
    }
};

// Print method to do user-facing logs
var print = function( message, arg ) {
    var scriptItem = Gitpoke.script[ message ];

    if ( typeof scriptItem == 'function' ) {
        scriptItem = scriptItem( arg );
    }

    if ( message == 'board' ) {
        clear();
    }
    if ( message == 'wait' || message == 'check' ) {
        process.stdout.write( scriptItem );
    } else {
        console.log( scriptItem );
    }
};

// Clears screen between drawing chess baord
var clear = function() {
    var lines = process.stdout.getWindowSize()[ 1 ];
    for ( var i = 0; i < lines; i++ ) {
        console.log( '\r\n' );
    }
};

Gitpoke.init();

module.exports = Gitpoke;
