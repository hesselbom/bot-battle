BotBattle
========

Bot battles!

Implement your bots in __/js/bots/dev/__ and they will appear as options. See __/js/bots/dev/testbot.js__ or __/js/bots/dev/emptybot.js__ for examples.

## Installation

    npm install; bower install

## Running

    gulp

This will run a server at __localhost:1337__ with all the bots and battlefield

## API

### Global object

Property            | Description
------------------- | -------------
BotBattle.MIN_POS    | Minimum position on map as Vector2
BotBattle.MAX_POS    | Maximum position on map as Vector2
BotBattle.MAX_HEALTH | Maximum health on a bot


### Methods

#### init
Parameter | Description
--------- | -------------
id        | Bot id, used to compare bots

This method gets called when creating bot. To setup initial values.

#### update

This method gets called every frame. You should always return a command for the bot to do. All available data is supplied in the parameters when the method is called.

##### Parameters
Parameter | Description
--------- | -------------
pos       | My position as Vector2
health    | My health left
reload    | Amount of frames left until you can shoot again
bots      | An array of all bots (excluding you)
bullets   | An array of all bullets (including your own)

##### Return
Should return one of the following commands

Command   | Description
--------- | -------------
DoNothing | Do nothing this frame
MoveUp    | Moves one pixel UP
MoveDown  | Moves one pixel DOWN
MoveLeft  | Moves one pixel LEFT
MoveRight | Moves one pixel RIGHT
Shoot(degreesOrVector) | Shoots at direction, either in degrees (0 being up, 90 being right, etc.) or as a directional Vector2


### Bot

The available properties on the Bot object is the following

Property    | Description
----------- | -------------
id          | Bot id
pos         | Current position [Vector2]
health      | Current health
prevCommand | The command the bot called the previous frame
prevPos     | The position the bot had the previous frame


### Bullet

The available properties on the Bullet object is the following

Property   | Description
---------- | -------------
bot        | Parent bot, the bot who shot the bullet
pos        | Current position [Vector2]
dir        | Current direction [Vector2]
vel        | Current velocity. I.e. direction * bullet speed (2) [Vector2]
