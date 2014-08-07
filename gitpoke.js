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
            print( 'score' );
            print( 'move' );
        });
    },

    script: {
        score: function() {
            return ( Gitwar.me + '\'s ' + Gitpoke.mine.name ).green + ': ' + Gitpoke.mine.hp + '\n' +
                ( Gitwar.opponent + '\'s ' + Gitpoke.theirs.name ).red + ': ' + Gitpoke.theirs.hp + '\n';
        },
        move: function() {
            var moves = Gitpoke.mine.moves();
            var longest = _.reduce( moves, function( max, move ) {
                return max > move.name.length ? max : move.name.length;
            }, 0 );
            var topLine = '┌──';
            for ( var i = 0; i < longest; i ++ ) { topLine += '─'; }
            topLine += '──┬──'
            for ( var i = 0; i < longest; i ++ ) { topLine += '─'; }
            topLine += '──┐\n│';
            var middleLine = '├──';
            for ( var i = 0; i < longest; i ++ ) { middleLine += '─'; }
            middleLine += '──┼──'
            for ( var i = 0; i < longest; i ++ ) { middleLine += '─'; }
            middleLine += '──┤';
            var bottomLine = '└──';
            for ( var i = 0; i < longest; i ++ ) { bottomLine += '─'; }
            bottomLine += '──┴──'
            for ( var i = 0; i < longest; i ++ ) { bottomLine += '─'; }
            bottomLine += '──┘';
            return moveNames = _.reduce( Gitpoke.mine.moves(), function( str, move, j ) {
                if ( j == 2 ) {
                    str += '\n' + middleLine + '\n│';
                }
                str += '  ';
                str += move.name;
                for ( var k = move.name.length; k < longest; k++ ) {
                    str += ' ';
                }
                str += '  │';
                if ( move < longest ) {
                }
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
            console.log(commits.reverse());
            return _.each( commits.reverse(), function( commit, i ) {
                console.log(commit.user,commit.select);
                // Selection commits are made at the beginning when the user is
                // asked to choose their character. The level, stats, and
                // possible moves are randomly selected. We store all of that
                // information in the commit
                if ( commit.select ) {
                    var mineOrTheirs = commit.user == Gitwar.me ? 'mine' : 'theirs';
                    console.log(mineOrTheirs,commit.user,Gitwar.me);
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

Gitpoke.init();

module.exports = Gitpoke;
