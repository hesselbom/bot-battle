(function($) {
    var _DoNothing = 1,
        _MoveUp = 2,
        _MoveDown = 3,
        _MoveLeft = 4,
        _MoveRight = 5,
        _Shoot = 6,
        RELOAD_FRAMES = 30,
        MAX_HEALTH = 5,
        BULLET_SPEED = 2,
        BOT_WIDTH = 32,
        BOT_HEIGHT = 32,
        ARENA_WIDTH = 800,
        ARENA_HEIGHT = 800,
        MIN_POS = new Vector2(0, 0),
        MAX_POS = new Vector2(ARENA_WIDTH, ARENA_HEIGHT),
        DESTROY_MIN_POS = new Vector2(-BOT_WIDTH, -BOT_HEIGHT),
        DESTROY_MAX_POS = new Vector2(ARENA_WIDTH + BOT_WIDTH, ARENA_HEIGHT + BOT_HEIGHT),
        START_POSITIONS = [
            new Vector2(50, 50),
            new Vector2(ARENA_WIDTH - 50, ARENA_HEIGHT - 50)
        ];

    window.DoNothing = Enum(_DoNothing);
    window.MoveUp = Enum(_MoveUp);
    window.MoveDown = Enum(_MoveDown);
    window.MoveLeft = Enum(_MoveLeft);
    window.MoveRight = Enum(_MoveRight);
    window.Shoot = function(degreesOrVector) {
        return Enum(_Shoot, degToVec(degreesOrVector));
    };

    window.BotBattle = {
        MIN_POS: MIN_POS,
        MAX_POS: MAX_POS,
        MAX_HEALTH: MAX_HEALTH,
        BOT_WIDTH: BOT_WIDTH,
        BOT_HEIGHT: BOT_HEIGHT,
        ARENA_WIDTH: ARENA_WIDTH,
        ARENA_HEIGHT: ARENA_HEIGHT
    };

    var engine = {
            bots: [],
            bullets: [],
            running: false,
            getFps: function() {
                var $input = $('[data-fps]'),
                    fps = parseInt($input.val());
                if (fps <= 0) fps = 1;
                if (fps >= 1000) fps = 1000;
                $input.val(fps);
                return 1000 / fps;
            }
        },
        _runningInterval,
        _botIds = 1,
        _firstTimePlaying = true;

    function degToVec(degreesOrVector) {
        if (degreesOrVector instanceof Vector2) {
            return degreesOrVector;
        }

        var radians = parseFloat(degreesOrVector - 90) * (Math.PI/180);
        return new Vector2(Math.cos(radians), Math.sin(radians));
    }

    function pointInRectangle(point, rectangleMin, rectangleMax) {
        return point.x > rectangleMin.x &&
            point.x < rectangleMax.x &&
            point.y > rectangleMin.y &&
            point.y < rectangleMax.y;
    }

    function updateBounds(bot) {
        bot.topLeft.x = bot.pos.x - BOT_WIDTH / 2;
        bot.topLeft.y = bot.pos.y - BOT_HEIGHT / 2;
        bot.btmRight.x = bot.pos.x + BOT_WIDTH / 2;
        bot.btmRight.y = bot.pos.y + BOT_HEIGHT / 2;
    }

    function addBot(name) {
        if (engine.bots.length >= START_POSITIONS.length) {
            alert('Max amount of allowed bots reached');
            return;
        }
        $.getScript('/js/bots/' + name + '.js')
            .done(function() {
                var botWrapper = {
                    id: _botIds++,
                    pos: START_POSITIONS[engine.bots.length].clone(),
                    topLeft: new Vector2(0, 0),
                    btmRight: new Vector2(0, 0),
                    bot: window.Bot,
                    health: MAX_HEALTH,
                    reload: RELOAD_FRAMES,
                    prevCommand: DoNothing,
                    prevPos: null
                };
                updateBounds(botWrapper);
                engine.bots.push(botWrapper);
                botWrapper.bot.init(botWrapper.id);
                window.Renderer.addBot(botWrapper);
                window.Bot = null;

                if (engine.bots.length >= START_POSITIONS.length) {
                    $('[data-bot]').addClass('disabled');
                    return;
                }
            });
    }

    function addBullet(bot, dir) {
        var direction = degToVec(dir).normalize();
        var bullet = {
            bot: bot,
            pos: bot.pos.clone(),
            dir: direction,
            vel: direction.multiplyScalar(BULLET_SPEED)
        };
        engine.bullets.push(bullet);
        return bullet;
    }

    function initRenderer() {
        (function() {
            if (typeof window.Renderer !== 'undefined') {
                window.Renderer.init(engine);
            }
            else {
                setTimeout(arguments.callee, 10);
            }
        }());
    }

    function step() {
        var availableBullets = $.map(engine.bullets, function(b, i) {
            return {
                bot: {
                    id: b.bot.id,
                    name: b.bot.bot.name,
                    pos: b.bot.pos,
                    health: b.bot.health,
                    prevCommand: b.bot.prevCommand,
                    prevPos: b.bot.prevPos
                },
                pos: b.pos.clone(),
                dir: b.dir.clone(),
                vel: b.vel.clone()
            }
        });

        engine.bullets = $.grep(engine.bullets, function(bullet, i) {
            bullet.pos.add(bullet.vel);

            // Is outside playing field?
            if (!pointInRectangle(bullet.pos, DESTROY_MIN_POS, DESTROY_MAX_POS)) {
                window.Renderer.killBullet(bullet);
                return false;
            }

            // Is hitting other player?
            var hitPlayer = false;
            $.each(engine.bots, function(i, bot) {
                if (bot !== bullet.bot && pointInRectangle(bullet.pos, bot.topLeft, bot.btmRight) && bot.health > 0) {
                    bot.health--;
                    window.Renderer.botHit(bot);
                    if (bot.health <= 0)
                        window.Renderer.killBot(bot);
                    hitPlayer = true;
                    return false;
                }
            });
            if (hitPlayer) {
                window.Renderer.killBullet(bullet);

                var winner = null,
                    botsAlive = 0;
                $.each(engine.bots, function(i, bot) {
                    if (bot.health > 0) {
                        winner = bot;
                        botsAlive++;
                    }
                });
                if (botsAlive === 1) {
                    botWon(winner);
                }
                return false;
            }

            return true;
        });

        $.each(engine.bots, function(i, bot) {
            if (bot.health > 0) {
                if (bot.reload > 0) bot.reload--;

                var availableBots = $.map($.grep(engine.bots, function(b, i) {
                    return bot !== b;
                }), function(b, i) {
                    return {
                        id: b.id,
                        name: b.bot.name,
                        pos: b.pos.clone(),
                        health: b.health,
                        prevCommand: b.prevCommand,
                        prevPos: (b.prevPos ? b.prevPos.clone() : b.prevPos)
                    }
                });

                var choice = bot.bot.update(bot.pos, bot.health, bot.reload, availableBots, availableBullets);
                switch(choice.id) {
                    case _MoveUp:    bot.pos.y--; break;
                    case _MoveDown:  bot.pos.y++; break;
                    case _MoveLeft:  bot.pos.x--; break;
                    case _MoveRight: bot.pos.x++; break;
                    case _Shoot:
                        if (bot.reload <= 0) {
                            window.Renderer.addBullet( addBullet(bot, choice.value) );
                            bot.reload = RELOAD_FRAMES;
                        }
                        break;
                }
                bot.pos = bot.pos.clamp(MIN_POS, MAX_POS);
                updateBounds(bot);
                bot.prevCommand = choice;
                bot.prevPos = bot.pos.clone();
            }
        });
    }

    function botWon(bot) {
        $('#battlefield').append($('<div class="battlefield__winner">').append($('<span>').text(bot.bot.name + ' won!')));
    }

    function animationCallback() {
        _firstTimePlaying = false;
        _runningInterval = setInterval(step, engine.getFps());
    }

    function play() {
        pause();

        if (_firstTimePlaying) {
            if (!window.Renderer.startingAnimation(animationCallback)) {
                animationCallback();
            }
        }
        else {
            _runningInterval = setInterval(step, engine.getFps());
        }

        $('[data-play]').addClass('disabled');
        $('[data-pause]').removeClass('disabled');
        $('[data-fps]').attr('disabled', 'disabled');
    }

    function pause() {
        if (typeof _runningInterval !== 'undefined') {
            clearInterval(_runningInterval);
        }

        $('[data-play]').removeClass('disabled');
        $('[data-pause]').addClass('disabled');
        $('[data-fps]').attr('disabled', null);
    }

    initRenderer();

    $('[data-play]').click(play.bind(this));
    $('[data-pause]').click(pause.bind(this));
    $('[data-bot]').click(function() {
        addBot($(this).attr('data-bot'));
    });
}(jQuery));
